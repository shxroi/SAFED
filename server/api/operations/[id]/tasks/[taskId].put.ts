import { db } from "../../../../utils/baseDb";
import {
  operationJobLists,
  operations,
  operationsEnroll,
} from "../../../../db/schema";
import { eq, and } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  try {
    const session = await getUserSession(event);
    const sessionUser = session?.user as
      | { id?: number | string; roles?: string }
      | undefined;

    if (!sessionUser?.id) {
      throw createError({
        statusCode: 401,
        message: "Unauthorized",
      });
    }

    const userId = Number(sessionUser.id);
    const idParam = getRouterParam(event, "id");
    const taskIdParam = getRouterParam(event, "taskId");
    const body = await readBody(event);

    if (!idParam || !taskIdParam) {
      throw createError({
        statusCode: 400,
        message: "Operation ID and Task ID are required",
      });
    }

    const operationId = parseInt(idParam, 10);
    const taskId = parseInt(taskIdParam, 10);

    if (
      Number.isNaN(operationId) ||
      operationId < 1 ||
      Number.isNaN(taskId) ||
      taskId < 1
    ) {
      throw createError({
        statusCode: 400,
        message: "Invalid operation ID or task ID",
      });
    }

    // Verify user is enrolled in this operation
    const [enrollment] = await db
      .select()
      .from(operationsEnroll)
      .where(
        and(
          eq(operationsEnroll.operationId, operationId),
          eq(operationsEnroll.userId, userId),
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
      throw createError({
        statusCode: 404,
        message: "Operation not found",
      });
    }

    if (operation.status !== "Active") {
      throw createError({
        statusCode: 400,
        message: "Tasks can only be updated for active operations",
      });
    }

    const { status, notes } = body;

    if (
      status !== undefined &&
      status !== null &&
      status !== "Good" &&
      status !== "Not Good"
    ) {
      throw createError({
        statusCode: 400,
        message: "Invalid status value",
      });
    }

    // Update the task status and notes
    // We also track who updated it (executedBy)
    const updated = await db
      .update(operationJobLists)
      .set({
        status: status || null,
        notes: notes || null,
        executedBy: userId,
      })
      .where(
        and(
          eq(operationJobLists.id, taskId),
          eq(operationJobLists.operationId, operationId),
        ),
      )
      .returning({ id: operationJobLists.id });

    if (updated.length === 0) {
      throw createError({
        statusCode: 404,
        message: "Task not found",
      });
    }

    return {
      success: true,
      message: "Task updated successfully",
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    console.error("Error updating task:", error);
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to update task",
    });
  }
});
