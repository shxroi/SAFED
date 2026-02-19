import { db } from "../../../utils/baseDb";
import {
  fieldDocumentations,
  operationJobLists,
  operations,
  operationsEnroll,
  operationTools,
} from "../../../db/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";

const normalizeIds = (values: number[]): number[] => {
  return [...new Set(values)].filter(
    (value) => Number.isInteger(value) && value > 0,
  );
};

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

    if (!idParam) {
      throw createError({
        statusCode: 400,
        message: "Operation ID is required",
      });
    }

    const operationId = parseInt(idParam, 10);
    if (Number.isNaN(operationId) || operationId < 1) {
      throw createError({
        statusCode: 400,
        message: "Invalid operation ID",
      });
    }

    // Verify user is enrolled as SUPERVISOR for this operation
    const enrollment = await db
      .select()
      .from(operationsEnroll)
      .where(
        and(
          eq(operationsEnroll.operationId, operationId),
          eq(operationsEnroll.userId, userId),
          eq(operationsEnroll.operationRole, "SUPERVISOR"),
        ),
      )
      .limit(1);

    if (!enrollment || enrollment.length === 0) {
      throw createError({
        statusCode: 403,
        message: "Only supervisors can complete operations",
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
        message: "Only active operations can be completed",
      });
    }

    const [pendingTasks, pendingToolPre, pendingToolPost] = await Promise.all([
      db
        .select({ id: operationJobLists.id })
        .from(operationJobLists)
        .where(
          and(
            eq(operationJobLists.operationId, operationId),
            isNull(operationJobLists.status),
          ),
        )
        .limit(1),
      db
        .select({ id: operationTools.id })
        .from(operationTools)
        .where(
          and(
            eq(operationTools.operationId, operationId),
            isNull(operationTools.preStatus),
          ),
        )
        .limit(1),
      db
        .select({ id: operationTools.id })
        .from(operationTools)
        .where(
          and(
            eq(operationTools.operationId, operationId),
            isNull(operationTools.postStatus),
          ),
        )
        .limit(1),
    ]);

    if (
      pendingTasks.length > 0 ||
      pendingToolPre.length > 0 ||
      pendingToolPost.length > 0
    ) {
      throw createError({
        statusCode: 400,
        message:
          "All checklist tasks and tool conditions must be completed before finishing the operation",
      });
    }

    const requiredTasks = await db
      .select({ id: operationJobLists.id })
      .from(operationJobLists)
      .where(
        and(
          eq(operationJobLists.operationId, operationId),
          eq(operationJobLists.documentationRequired, true),
        ),
      );

    if (requiredTasks.length > 0) {
      const requiredTaskIds = normalizeIds(
        requiredTasks.map((task) => task.id),
      );

      if (requiredTaskIds.length > 0) {
        const docs = await db
          .select({ joblistId: fieldDocumentations.joblistId })
          .from(fieldDocumentations)
          .where(inArray(fieldDocumentations.joblistId, requiredTaskIds));

        const documentedTaskIds = new Set(docs.map((doc) => doc.joblistId));
        const missingDocumentation = requiredTaskIds.some(
          (taskId) => !documentedTaskIds.has(taskId),
        );

        if (missingDocumentation) {
          throw createError({
            statusCode: 400,
            message:
              "Required documentation photos are missing for one or more tasks",
          });
        }
      }
    }

    // Update operation status to Complete
    await db
      .update(operations)
      .set({ status: "Complete" })
      .where(eq(operations.id, operationId));

    return {
      success: true,
      message: "Operation marked as complete",
    };
  } catch (error: any) {
    console.error("Error completing operation:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to complete operation",
    });
  }
});
