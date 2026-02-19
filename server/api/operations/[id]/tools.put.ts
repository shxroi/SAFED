import { db } from "../../../utils/baseDb";
import {
  operationTools,
  operations,
  operationsEnroll,
} from "../../../db/schema";
import { eq, and } from "drizzle-orm";

type ToolUpdateInput = {
  id?: number;
  preStatus?: "Good" | "Not Good" | null;
  postStatus?: "Good" | "Not Good" | null;
  preNote?: string | null;
  postNote?: string | null;
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

    const idParam = getRouterParam(event, "id");
    const body = await readBody(event);

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

    // Verify user is enrolled in this operation
    const [enrollment] = await db
      .select()
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
      throw createError({
        statusCode: 404,
        message: "Operation not found",
      });
    }

    if (operation.status !== "Active") {
      throw createError({
        statusCode: 400,
        message: "Tools can only be updated for active operations",
      });
    }

    const { tools } = body as { tools?: ToolUpdateInput[] };

    if (!tools || !Array.isArray(tools)) {
      throw createError({
        statusCode: 400,
        message: "Tools array is required",
      });
    }

    const validStatus = new Set(["Good", "Not Good", null, undefined]);

    // Update each tool's status
    for (const tool of tools) {
      if (!tool.id || Number.isNaN(Number(tool.id)) || Number(tool.id) < 1)
        continue;

      if (
        !validStatus.has(tool.preStatus) ||
        !validStatus.has(tool.postStatus)
      ) {
        throw createError({
          statusCode: 400,
          message: "Invalid tool status value",
        });
      }

      const updated = await db
        .update(operationTools)
        .set({
          preStatus: tool.preStatus || null,
          postStatus: tool.postStatus || null,
          preNote: tool.preNote || null,
          postNote: tool.postNote || null,
        })
        .where(
          and(
            eq(operationTools.id, Number(tool.id)),
            eq(operationTools.operationId, operationId),
          ),
        )
        .returning({ id: operationTools.id });

      if (updated.length === 0) {
        throw createError({
          statusCode: 404,
          message: `Tool ${tool.id} not found in this operation`,
        });
      }
    }

    return {
      success: true,
      message: "Tools updated successfully",
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    console.error("Error updating tools:", error);
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to update tools",
    });
  }
});
