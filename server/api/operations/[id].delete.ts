import { baseDb } from "../../utils/baseDb";
import {
  fieldDocumentations,
  operationJobLists,
  operations,
  operationsEnroll,
  operationTools,
  jobsection,
} from "../../db/schema";
import { eq, inArray } from "drizzle-orm";
import { join } from "node:path";
import { unlink } from "node:fs/promises";

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
      throw createError({ statusCode: 401, message: "Unauthorized" });
    }

    if (sessionUser.roles !== "IM") {
      throw createError({ statusCode: 403, message: "Forbidden" });
    }

    const idParam = getRouterParam(event, "id");

    if (!idParam) {
      throw createError({
        statusCode: 400,
        message: "Operation ID is required",
      });
    }

    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: "Invalid Operation ID",
      });
    }

    await baseDb.transaction(async (tx) => {
      const [operation] = await tx
        .select()
        .from(operations)
        .where(eq(operations.id, id));

      if (!operation) {
        throw createError({
          statusCode: 404,
          message: "Operation not found",
        });
      }

      // if (operation.status !== "Draft") {
      //   throw createError({
      //     statusCode: 400,
      //     message: "Only draft operations can be deleted",
      //   });
      // }

      const operationTasks = await tx
        .select({ id: operationJobLists.id })
        .from(operationJobLists)
        .where(eq(operationJobLists.operationId, id));

      const taskIds = normalizeIds(operationTasks.map((task) => task.id));
      let documentationPaths: Array<{ filePath: string }> = [];

      if (taskIds.length > 0) {
        documentationPaths = await tx
          .select({ filePath: fieldDocumentations.filePath })
          .from(fieldDocumentations)
          .where(inArray(fieldDocumentations.joblistId, taskIds));

        await tx
          .delete(fieldDocumentations)
          .where(inArray(fieldDocumentations.joblistId, taskIds));
      }

      await tx.delete(operationTools).where(eq(operationTools.operationId, id));
      await tx
        .delete(operationJobLists)
        .where(eq(operationJobLists.operationId, id));
      await tx.delete(jobsection).where(eq(jobsection.operationId, id));
      await tx
        .delete(operationsEnroll)
        .where(eq(operationsEnroll.operationId, id));
      await tx.delete(operations).where(eq(operations.id, id));

      for (const doc of documentationPaths) {
        if (!doc.filePath.startsWith("/uploads/")) continue;
        const diskPath = join(
          process.cwd(),
          "public",
          doc.filePath.replace(/^\//, ""),
        );
        await unlink(diskPath).catch(() => undefined);
      }
    });

    return {
      success: true,
      message: "Operation deleted successfully",
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    console.error("Error deleting operation:", error);
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to delete operation",
    });
  }
});
