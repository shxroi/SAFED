import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../utils/baseDb";
import {
  fieldDocumentations,
  fieldReports,
  operationJobLists,
  operations,
  operationsEnroll,
  users,
} from "../../../../db/schema";
import { buildFieldReportPdf } from "../../../../utils/reportPdf";

const reportPayloadSchema = z
  .object({
    referenceNumber: z
      .string()
      .trim()
      .min(1, "Reference number is required")
      .max(120, "Reference number is too long"),
    serialNumber: z
      .string()
      .trim()
      .min(1, "Serial number is required")
      .max(120, "Serial number is too long"),
    crewName: z
      .string()
      .trim()
      .max(255, "Crew name is too long")
      .default(""),
    crewSignRequired: z.boolean().default(false),
    notes: z
      .array(
        z.object({
          note: z.string().trim().min(1, "Attachment note is required"),
          documentationIds: z.array(z.number().int().positive()).default([]),
        }),
      )
      .min(1, "At least one attachment note is required")
      .max(30, "Too many attachment notes")
      .default([]),
  })
  .superRefine((value, context) => {
    if (value.crewSignRequired && value.crewName.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["crewName"],
        message: "Crew name is required",
      });
    }
  });

export default defineEventHandler(async (event) => {
  try {
    const session = await getUserSession(event);
    const sessionUser = session?.user as
      | { id?: number | string; roles?: string }
      | undefined;

    if (!sessionUser?.id) {
      throw createError({ statusCode: 401, message: "Unauthorized" });
    }

    const userId = Number(sessionUser.id);
    const operationId = Number(getRouterParam(event, "id"));

    if (Number.isNaN(operationId) || operationId < 1) {
      throw createError({ statusCode: 400, message: "Invalid operation ID" });
    }

    const parsed = reportPayloadSchema.safeParse(await readBody(event));
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        message: parsed.error.issues[0]?.message || "Invalid report payload",
      });
    }

    const payload = parsed.data;
    const normalizedCrewName = payload.crewSignRequired ? payload.crewName : "";

    const [operation] = await db
      .select({
        id: operations.id,
        status: operations.status,
        company: operations.company,
        vesselName: operations.vesselName,
        date: operations.date,
        location: operations.location,
      })
      .from(operations)
      .where(eq(operations.id, operationId))
      .limit(1);

    if (!operation) {
      throw createError({ statusCode: 404, message: "Operation not found" });
    }

    if (operation.status !== "Complete") {
      throw createError({
        statusCode: 400,
        message: "Report can only be generated for completed operations",
      });
    }

    const [supervisorEnrollment] = await db
      .select({
        id: operationsEnroll.id,
        supervisorName: users.name,
      })
      .from(operationsEnroll)
      .innerJoin(users, eq(operationsEnroll.userId, users.id))
      .where(
        and(
          eq(operationsEnroll.operationId, operationId),
          eq(operationsEnroll.userId, userId),
          eq(operationsEnroll.operationRole, "SUPERVISOR"),
        ),
      )
      .limit(1);

    if (!supervisorEnrollment) {
      throw createError({
        statusCode: 403,
        message: "Only supervisor can preview field report",
      });
    }

    const [existingReport] = await db
      .select({ id: fieldReports.id })
      .from(fieldReports)
      .where(eq(fieldReports.operationId, operationId))
      .limit(1);

    if (existingReport) {
      throw createError({
        statusCode: 409,
        message: "Field report has already been generated",
      });
    }

    const normalizedNotes = payload.notes.map((note) => ({
      note: note.note,
      documentationIds: [...new Set(note.documentationIds)],
    }));

    const requestedDocIds = [
      ...new Set(normalizedNotes.flatMap((note) => note.documentationIds)),
    ];

    let validDocs: Array<{
      id: number;
      fileName: string;
      filePath: string;
    }> = [];

    if (requestedDocIds.length > 0) {
      validDocs = await db
        .select({
          id: fieldDocumentations.id,
          fileName: fieldDocumentations.fileName,
          filePath: fieldDocumentations.filePath,
        })
        .from(fieldDocumentations)
        .innerJoin(
          operationJobLists,
          eq(fieldDocumentations.joblistId, operationJobLists.id),
        )
        .where(
          and(
            eq(operationJobLists.operationId, operationId),
            inArray(fieldDocumentations.id, requestedDocIds),
          ),
        );

      if (validDocs.length !== requestedDocIds.length) {
        throw createError({
          statusCode: 400,
          message: "One or more selected documentations are invalid",
        });
      }
    }

    const docsById = new Map(validDocs.map((doc) => [doc.id, doc]));
    const reportPdfBytes = await buildFieldReportPdf({
      operationId,
      operationTitle: operation.vesselName || operation.company,
      operationLocation: operation.location,
      operationDate: operation.date,
      supervisorName: supervisorEnrollment.supervisorName,
      generatedAt: new Date(),
      referenceNumber: payload.referenceNumber,
      serialNumber: payload.serialNumber,
      crewName: normalizedCrewName,
      crewSignRequired: payload.crewSignRequired,
      notes: normalizedNotes.map((note) => ({
        note: note.note,
        documentations: note.documentationIds
          .map((docId) => docsById.get(docId))
          .filter(Boolean) as Array<{ fileName: string; filePath: string }>,
      })),
    });

    setHeader(event, "Content-Type", "application/pdf");
    setHeader(
      event,
      "Content-Disposition",
      `inline; filename="field-report-preview-${operationId}.pdf"`,
    );
    return reportPdfBytes;
  } catch (error: any) {
    if (error.statusCode) throw error;

    console.error("Error previewing field report:", error);
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to preview field report",
    });
  }
});
