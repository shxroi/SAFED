import { baseDb } from "../../utils/baseDb";
import {
  fieldReportNoteDocumentations,
  fieldReportNotes,
  fieldReports,
  fieldDocumentations,
  operationJobLists,
  operationTools,
  jobsection,
  operationsEnroll,
  operations,
} from "../../db/schema";

export default defineEventHandler(async (event) => {
  try {
    if (process.env.NODE_ENV === "production") {
      throw createError({ statusCode: 404, message: "Not found" });
    }

    const session = await getUserSession(event);
    const sessionUser = session?.user as
      | { id?: number | string; roles?: string }
      | undefined;

    if (!sessionUser?.id) {
      throw createError({ statusCode: 401, message: "Unauthorized" });
    }

    if (sessionUser.roles !== "IM") {
      throw createError({ statusCode: 403, message: "Forbidden" });
    }

    // Delete in reverse FK dependency order

    const deletedReportNoteDocs = await baseDb
      .delete(fieldReportNoteDocumentations)
      .returning({ id: fieldReportNoteDocumentations.id });
    const deletedReportNotes = await baseDb
      .delete(fieldReportNotes)
      .returning({ id: fieldReportNotes.id });
    const deletedReports = await baseDb
      .delete(fieldReports)
      .returning({ id: fieldReports.id });
    const deletedDocs = await baseDb
      .delete(fieldDocumentations)
      .returning({ id: fieldDocumentations.id });
    const deletedJobs = await baseDb
      .delete(operationJobLists)
      .returning({ id: operationJobLists.id });
    const deletedTools = await baseDb
      .delete(operationTools)
      .returning({ id: operationTools.id });
    const deletedSections = await baseDb
      .delete(jobsection)
      .returning({ id: jobsection.id });
    const deletedEnrolls = await baseDb
      .delete(operationsEnroll)
      .returning({ id: operationsEnroll.id });
    const deletedOps = await baseDb
      .delete(operations)
      .returning({ id: operations.id });

    return {
      success: true,
      message:
        "All operation data cleaned successfully. Users and Tools were preserved.",
      deleted: {
        operations: deletedOps.length,
        enrollments: deletedEnrolls.length,
        jobSections: deletedSections.length,
        operationTools: deletedTools.length,
        jobLists: deletedJobs.length,
        fieldDocumentations: deletedDocs.length,
        fieldReports: deletedReports.length,
        fieldReportNotes: deletedReportNotes.length,
        fieldReportNoteDocumentations: deletedReportNoteDocs.length,
      },
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    console.error("Error cleaning operation data:", error);
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to clean operation data",
    });
  }
});
