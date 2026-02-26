import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  fieldDocumentations,
  fieldReportNoteDocumentations,
  fieldReportNotes,
  fieldReports,
  operationJobLists,
  operations,
  operationsEnroll,
  users,
} from "../../../db/schema";
import { buildFieldReportPdf } from "../../../utils/reportPdf";
import { baseDb } from "~~/server/utils/baseDb";

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

const toDiskPathFromPublicUploadPath = (
  publicUploadPath: string,
): string | null => {
  if (!publicUploadPath.startsWith("/uploads/")) return null;
  const relativePath = publicUploadPath.replace("/uploads/", "");
  return join(process.cwd(), "public", "uploads", relativePath);
};

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

    const [operation] = await baseDb
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

    const [supervisorEnrollment] = await baseDb
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
        message: "Only supervisor can generate field report",
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
      validDocs = await baseDb
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
    const generatedAt = new Date();

    const reportPdfBytes = await buildFieldReportPdf({
      operationId,
      operationTitle: operation.vesselName || operation.company,
      operationLocation: operation.location,
      operationDate: operation.date,
      supervisorName: supervisorEnrollment.supervisorName,
      generatedAt,
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

    const fileKey = `field-report-${Date.now()}.pdf`;
    const reportDir = join(
      process.cwd(),
      "public",
      "uploads",
      "operations",
      String(operationId),
      "reports",
    );
    const diskPath = join(reportDir, fileKey);
    const publicPath = `/uploads/operations/${operationId}/reports/${fileKey}`;

    await mkdir(reportDir, { recursive: true });
    await writeFile(diskPath, reportPdfBytes);

    const reportResult = await baseDb
      .transaction(async (tx) => {
        const [existingReport] = await tx
          .select({ id: fieldReports.id, pdfPath: fieldReports.pdfPath })
          .from(fieldReports)
          .where(eq(fieldReports.operationId, operationId))
          .limit(1);

        let activeReportId = existingReport?.id;
        const previousPdfPath = existingReport?.pdfPath || null;

        if (!activeReportId) {
          const [createdReport] = await tx
            .insert(fieldReports)
            .values({
              operationId,
              referenceNumber: payload.referenceNumber,
              serialNumber: payload.serialNumber,
              crewName: normalizedCrewName,
              crewSignRequired: payload.crewSignRequired,
              summary: "",
              recommendation: "",
              pdfPath: publicPath,
              generatedBy: userId,
              generatedAt,
            })
            .returning({ id: fieldReports.id });

          if (!createdReport) {
            throw createError({
              statusCode: 500,
              message: "Failed to create report",
            });
          }

          activeReportId = createdReport.id;
        } else {
          await tx
            .update(fieldReports)
            .set({
              referenceNumber: payload.referenceNumber,
              serialNumber: payload.serialNumber,
              crewName: normalizedCrewName,
              crewSignRequired: payload.crewSignRequired,
              summary: "",
              recommendation: "",
              pdfPath: publicPath,
              generatedBy: userId,
              generatedAt,
            })
            .where(eq(fieldReports.id, activeReportId));
        }

        const existingNotes = await tx
          .select({ id: fieldReportNotes.id })
          .from(fieldReportNotes)
          .where(eq(fieldReportNotes.reportId, activeReportId));

        const existingNoteIds = existingNotes.map((note) => note.id);
        if (existingNoteIds.length > 0) {
          await tx
            .delete(fieldReportNoteDocumentations)
            .where(inArray(fieldReportNoteDocumentations.noteId, existingNoteIds));
          await tx
            .delete(fieldReportNotes)
            .where(inArray(fieldReportNotes.id, existingNoteIds));
        }

        for (const note of normalizedNotes) {
          const [insertedNote] = await tx
            .insert(fieldReportNotes)
            .values({
              reportId: activeReportId,
              note: note.note,
            })
            .returning({ id: fieldReportNotes.id });

          if (!insertedNote) {
            throw createError({
              statusCode: 500,
              message: "Failed to create report note",
            });
          }

          if (note.documentationIds.length > 0) {
            await tx.insert(fieldReportNoteDocumentations).values(
              note.documentationIds.map((documentationId) => ({
                noteId: insertedNote.id,
                documentationId,
              })),
            );
          }
        }

        return {
          reportId: activeReportId,
          previousPdfPath,
        };
      })
      .catch(async (transactionError) => {
        await unlink(diskPath).catch(() => undefined);
        throw transactionError;
      });

    if (
      reportResult.previousPdfPath &&
      reportResult.previousPdfPath !== publicPath
    ) {
      const previousDiskPath = toDiskPathFromPublicUploadPath(
        reportResult.previousPdfPath,
      );
      if (previousDiskPath) {
        await unlink(previousDiskPath).catch(() => undefined);
      }
    }

    
    return {
      success: true,
      report: {
        id: reportResult.reportId,
        pdfPath: publicPath,
      },
      message: "Field report generated successfully",
    };
  } catch (error: any) {
    if (error.statusCode) throw error;

    console.error("Error generating field report:", error);
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to generate field report",
    });
  }
});
