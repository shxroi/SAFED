import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "../../../../../../utils/baseDb";
import {
  fieldDocumentations,
  operationJobLists,
  operations,
  operationsEnroll,
} from "../../../../../../db/schema";

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
    const taskId = Number(getRouterParam(event, "taskId"));
    const docId = Number(getRouterParam(event, "docId"));

    if (
      Number.isNaN(operationId) ||
      operationId < 1 ||
      Number.isNaN(taskId) ||
      taskId < 1 ||
      Number.isNaN(docId) ||
      docId < 1
    ) {
      throw createError({
        statusCode: 400,
        message: "Invalid operation, task, or documentation ID",
      });
    }

    const [enrollment] = await db
      .select({ id: operationsEnroll.id })
      .from(operationsEnroll)
      .where(
        and(
          eq(operationsEnroll.operationId, operationId),
          eq(operationsEnroll.userId, Number(sessionUser.id)),
        ),
      )
      .limit(1);

    if (!enrollment) {
      throw createError({
        statusCode: 403,
        message: "You are not enrolled in this operation",
      });
    }

    const [operation] = await db
      .select({ id: operations.id, status: operations.status })
      .from(operations)
      .where(eq(operations.id, operationId))
      .limit(1);

    if (!operation) {
      throw createError({ statusCode: 404, message: "Operation not found" });
    }

    if (operation.status !== "Active") {
      throw createError({
        statusCode: 400,
        message: "Documentation can only be updated for active operations",
      });
    }

    const [task] = await db
      .select({ id: operationJobLists.id })
      .from(operationJobLists)
      .where(
        and(
          eq(operationJobLists.id, taskId),
          eq(operationJobLists.operationId, operationId),
        ),
      )
      .limit(1);

    if (!task) {
      throw createError({ statusCode: 404, message: "Task not found" });
    }

    const [documentation] = await db
      .select({
        id: fieldDocumentations.id,
        filePath: fieldDocumentations.filePath,
      })
      .from(fieldDocumentations)
      .where(
        and(
          eq(fieldDocumentations.id, docId),
          eq(fieldDocumentations.joblistId, taskId),
        ),
      )
      .limit(1);

    if (!documentation) {
      throw createError({
        statusCode: 404,
        message: "Documentation not found",
      });
    }

    await db
      .delete(fieldDocumentations)
      .where(eq(fieldDocumentations.id, documentation.id));

    if (documentation.filePath.startsWith("/uploads/")) {
      const relative = documentation.filePath.replace("/uploads/", "");
      const diskPath = join(process.cwd(), "public", "uploads", relative);
      await unlink(diskPath).catch(() => undefined);
    }

    return {
      success: true,
      message: "Documentation deleted successfully",
    };
  } catch (error: any) {
    if (error.statusCode) throw error;

    console.error("Error deleting documentation image:", error);
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to delete documentation image",
    });
  }
});
