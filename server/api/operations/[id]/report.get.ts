import { and, eq, inArray } from "drizzle-orm";
import { baseDb } from "../../../utils/baseDb";
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

    const [operation] = await baseDb
      .select({
        id: operations.id,
        status: operations.status,
        company: operations.company,
        vesselName: operations.vesselName,
        type: operations.type,
        date: operations.date,
        location: operations.location,
      })
      .from(operations)
      .where(eq(operations.id, operationId))
      .limit(1);

    if (!operation) {
      throw createError({ statusCode: 404, message: "Operation not found" });
    }

    const [userEnrollment] = await baseDb
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

    const [supervisor] = await baseDb
      .select({
        supervisorName: users.name,
      })
      .from(operationsEnroll)
      .innerJoin(users, eq(operationsEnroll.userId, users.id))
      .where(
        and(
          eq(operationsEnroll.operationId, operationId),
          eq(operationsEnroll.operationRole, "SUPERVISOR"),
        ),
      )
      .limit(1);

    const canGenerate =
      userEnrollment?.operationRole === "SUPERVISOR" &&
      operation.status === "Complete";

    const [report] = await baseDb
      .select({
        id: fieldReports.id,
        referenceNumber: fieldReports.referenceNumber,
        serialNumber: fieldReports.serialNumber,
        crewName: fieldReports.crewName,
        crewSignRequired: fieldReports.crewSignRequired,
        pdfPath: fieldReports.pdfPath,
        generatedAt: fieldReports.generatedAt,
      })
      .from(fieldReports)
      .where(eq(fieldReports.operationId, operationId))
      .limit(1);

    const availableDocumentations = await baseDb
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
          supervisorName: supervisor?.supervisorName || null,
        },
        report: null,
        canGenerate,
        availableDocumentations: availableDocumentations.map((doc) => ({
          ...doc,
          timestamp: doc.timestamp.toISOString(),
        })),
      };
    }

    const notes = await baseDb
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
      filePath: string;
    }> = [];

    if (noteIds.length > 0) {
      linkedDocs = await baseDb
        .select({
          noteId: fieldReportNoteDocumentations.noteId,
          documentationId: fieldReportNoteDocumentations.documentationId,
          fileName: fieldDocumentations.fileName,
          filePath: fieldDocumentations.filePath,
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
          filePath: link.filePath,
        });
        return acc;
      },
      {} as Record<
        number,
        Array<{ id: number; fileName: string; filePath: string }>
      >,
    );

    return {
      operation: {
        ...operation,
        date: operation.date.toISOString(),
        supervisorName: supervisor?.supervisorName || null,
      },
      report: {
        id: report.id,
        referenceNumber: report.referenceNumber,
        serialNumber: report.serialNumber,
        crewName: report.crewName,
        crewSignRequired: report.crewSignRequired,
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
