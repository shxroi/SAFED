import { db } from "../../utils/baseDb";
import {
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

    const deletedDocs = await db
      .delete(fieldDocumentations)
      .returning({ id: fieldDocumentations.id });
    const deletedJobs = await db
      .delete(operationJobLists)
      .returning({ id: operationJobLists.id });
    const deletedTools = await db
      .delete(operationTools)
      .returning({ id: operationTools.id });
    const deletedSections = await db
      .delete(jobsection)
      .returning({ id: jobsection.id });
    const deletedEnrolls = await db
      .delete(operationsEnroll)
      .returning({ id: operationsEnroll.id });
    const deletedOps = await db
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
