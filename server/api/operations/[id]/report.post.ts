import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../utils/baseDb";
import {
  fieldDocumentations,
  fieldReportNoteDocumentations,
  fieldReportNotes,
  fieldReports,
  operationJobLists,
  operations,
  operationsEnroll,
} from "../../../db/schema";
import { buildFieldReportPdf } from "../../../utils/reportPdf";

const reportPayloadSchema = z.object({
  summary: z.string().trim().min(1, "Summary is required"),
  recommendation: z.string().trim().min(1, "Recommendation is required"),
  notes: z
    .array(
      z.object({
        note: z.string().trim().min(1, "Note is required"),
        documentationIds: z.array(z.number().int().positive()).default([]),
      }),
    )
    .max(30, "Too many notes")
    .default([]),
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

    const body = await readBody(event);
    const parsed = reportPayloadSchema.safeParse(body);
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        message: parsed.error.issues[0]?.message || "Invalid report payload",
      });
    }

    const payload = parsed.data;

    const [operation] = await db
      .select({
        id: operations.id,
        status: operations.status,
        company: operations.company,
        vesselName: operations.vesselName,
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
      .select({ id: operationsEnroll.id })
      .from(operationsEnroll)
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

    const requestedDocIds = [
      ...new Set(payload.notes.flatMap((note) => note.documentationIds)),
    ];

    let validDocs: Array<{
      id: number;
      fileName: string;
    }> = [];

    if (requestedDocIds.length > 0) {
      validDocs = await db
        .select({
          id: fieldDocumentations.id,
          fileName: fieldDocumentations.fileName,
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
      generatedAt,
      summary: payload.summary,
      recommendation: payload.recommendation,
      notes: payload.notes.map((note) => ({
        note: note.note,
        documentationNames: note.documentationIds
          .map((docId) => docsById.get(docId)?.fileName || "")
          .filter(Boolean),
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

    const reportId = await db.transaction(async (tx) => {
      const [existingReport] = await tx
        .select({ id: fieldReports.id })
        .from(fieldReports)
        .where(eq(fieldReports.operationId, operationId))
        .limit(1);

      let activeReportId = existingReport?.id;

      if (!activeReportId) {
        const [createdReport] = await tx
          .insert(fieldReports)
          .values({
            operationId,
            summary: payload.summary,
            recommendation: payload.recommendation,
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
            summary: payload.summary,
            recommendation: payload.recommendation,
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

      for (const note of payload.notes) {
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

      return activeReportId;
    });

    return {
      success: true,
      report: {
        id: reportId,
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
