import { and, eq, inArray } from "drizzle-orm";
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

export default defineEventHandler(async (event) => {
  try {
    const session = await getUserSession(event);
    const sessionUser = session?.user as
      | { id?: number | string; roles?: string }
      | undefined;

    if (!sessionUser?.id) {
      throw createError({ statusCode: 401, message: "Unauthorized" });
    }

    const operationId = Number(getRouterParam(event, "id"));
    if (Number.isNaN(operationId) || operationId < 1) {
      throw createError({ statusCode: 400, message: "Invalid operation ID" });
    }

    const [operation] = await db
      .select({
        id: operations.id,
        status: operations.status,
        company: operations.company,
        vesselName: operations.vesselName,
        type: operations.type,
        date: operations.date,
      })
      .from(operations)
      .where(eq(operations.id, operationId))
      .limit(1);

    if (!operation) {
      throw createError({ statusCode: 404, message: "Operation not found" });
    }

    const [userEnrollment] = await db
      .select({
        id: operationsEnroll.id,
        operationRole: operationsEnroll.operationRole,
      })
      .from(operationsEnroll)
      .where(
        and(
          eq(operationsEnroll.operationId, operationId),
          eq(operationsEnroll.userId, Number(sessionUser.id)),
        ),
      )
      .limit(1);

    if (sessionUser.roles === "STAFF") {
      if (!userEnrollment) {
        throw createError({ statusCode: 403, message: "Forbidden" });
      }
    }

    const canGenerate = userEnrollment?.operationRole === "SUPERVISOR";

    const [report] = await db
      .select({
        id: fieldReports.id,
        summary: fieldReports.summary,
        recommendation: fieldReports.recommendation,
        pdfPath: fieldReports.pdfPath,
        generatedAt: fieldReports.generatedAt,
      })
      .from(fieldReports)
      .where(eq(fieldReports.operationId, operationId))
      .limit(1);

    const availableDocumentations = await db
      .select({
        id: fieldDocumentations.id,
        taskId: fieldDocumentations.joblistId,
        filePath: fieldDocumentations.filePath,
        fileName: fieldDocumentations.fileName,
        timestamp: fieldDocumentations.timestamp,
      })
      .from(fieldDocumentations)
      .innerJoin(
        operationJobLists,
        eq(fieldDocumentations.joblistId, operationJobLists.id),
      )
      .where(eq(operationJobLists.operationId, operationId));

    if (!report) {
      return {
        operation: {
          ...operation,
          date: operation.date.toISOString(),
        },
        report: null,
        canGenerate,
        availableDocumentations: availableDocumentations.map((doc) => ({
          ...doc,
          timestamp: doc.timestamp.toISOString(),
        })),
      };
    }

    const notes = await db
      .select({
        id: fieldReportNotes.id,
        note: fieldReportNotes.note,
      })
      .from(fieldReportNotes)
      .where(eq(fieldReportNotes.reportId, report.id));

    const noteIds = notes.map((note) => note.id);

    let linkedDocs: Array<{
      noteId: number;
      documentationId: number;
      fileName: string;
    }> = [];

    if (noteIds.length > 0) {
      linkedDocs = await db
        .select({
          noteId: fieldReportNoteDocumentations.noteId,
          documentationId: fieldReportNoteDocumentations.documentationId,
          fileName: fieldDocumentations.fileName,
        })
        .from(fieldReportNoteDocumentations)
        .innerJoin(
          fieldDocumentations,
          eq(
            fieldReportNoteDocumentations.documentationId,
            fieldDocumentations.id,
          ),
        )
        .where(inArray(fieldReportNoteDocumentations.noteId, noteIds));
    }

    const docsByNote = linkedDocs.reduce(
      (acc, link) => {
        const key = link.noteId;
        if (!acc[key]) acc[key] = [];
        acc[key].push({
          id: link.documentationId,
          fileName: link.fileName,
        });
        return acc;
      },
      {} as Record<number, Array<{ id: number; fileName: string }>>,
    );

    return {
      operation: {
        ...operation,
        date: operation.date.toISOString(),
      },
      report: {
        id: report.id,
        summary: report.summary,
        recommendation: report.recommendation,
        pdfPath: report.pdfPath,
        generatedAt: report.generatedAt.toISOString(),
        notes: notes.map((note) => ({
          id: note.id,
          note: note.note,
          documentations: docsByNote[note.id] || [],
        })),
      },
      canGenerate,
      availableDocumentations: availableDocumentations.map((doc) => ({
        ...doc,
        timestamp: doc.timestamp.toISOString(),
      })),
    };
  } catch (error: any) {
    if (error.statusCode) throw error;

    console.error("Error fetching report:", error);
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to fetch report",
    });
  }
});
