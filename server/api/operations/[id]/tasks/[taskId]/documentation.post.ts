import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { db } from "../../../../../utils/baseDb";
import {
  fieldDocumentations,
  operationJobLists,
  operations,
  operationsEnroll,
} from "../../../../../db/schema";

export default defineEventHandler(async (event) => {
  try {
    const session = await getUserSession(event);
    const sessionUser = session?.user as
      | { id?: number | string; roles?: string }
      | undefined;

    if (!sessionUser?.id) {
      throw createError({ statusCode: 401, message: "Unauthorized" });
    }

    const operationIdParam = getRouterParam(event, "id");
    const taskIdParam = getRouterParam(event, "taskId");

    const operationId = Number(operationIdParam);
    const taskId = Number(taskIdParam);

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
      .select({
        id: operationJobLists.id,
        documentationRequired: operationJobLists.documentationRequired,
      })
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

    if (!task.documentationRequired) {
      throw createError({
        statusCode: 400,
        message: "Documentation is not required for this task",
      });
    }

    const formData = await readMultipartFormData(event);
    const uploadedFile = formData?.find(
      (part) => part.name === "file" && part.data,
    );

    if (!uploadedFile || !uploadedFile.filename || !uploadedFile.type) {
      throw createError({ statusCode: 400, message: "Image file is required" });
    }

    if (!uploadedFile.type.startsWith("image/")) {
      throw createError({
        statusCode: 400,
        message: "Only image files are allowed",
      });
    }

    const MAX_RAW_UPLOAD_BYTES = 10 * 1024 * 1024;
    if (uploadedFile.data.length > MAX_RAW_UPLOAD_BYTES) {
      throw createError({
        statusCode: 400,
        message: "File too large. Max 10 MB.",
      });
    }

    const optimizedBuffer = await sharp(uploadedFile.data)
      .rotate()
      .webp({ quality: 82 })
      .toBuffer();

    const originalFileName = String(uploadedFile.filename);

    const now = Date.now();
    const random = randomBytes(6).toString("hex");
    const fileKey = `${now}-${random}.webp`;
    const storageKey = `operations/${operationId}/joblists/${taskId}/${fileKey}`;

    const fileDir = join(
      process.cwd(),
      "public",
      "uploads",
      "operations",
      String(operationId),
      "joblists",
      String(taskId),
    );
    const diskPath = join(fileDir, fileKey);

    await mkdir(fileDir, { recursive: true });
    await writeFile(diskPath, optimizedBuffer);

    const publicPath = `/uploads/${storageKey}`;

    const [documentation] = await db
      .transaction(async (tx) => {
        await tx.execute(
          sql`SELECT ${operationJobLists.id} FROM ${operationJobLists} WHERE ${operationJobLists.id} = ${taskId} AND ${operationJobLists.operationId} = ${operationId} FOR UPDATE`,
        );

        const existingDocs = await tx
          .select({ id: fieldDocumentations.id })
          .from(fieldDocumentations)
          .where(eq(fieldDocumentations.joblistId, taskId));

        if (existingDocs.length >= 2) {
          throw createError({
            statusCode: 400,
            message: "Maximum 2 photos allowed per task",
          });
        }

        return tx
          .insert(fieldDocumentations)
          .values({
            joblistId: taskId,
            filePath: publicPath,
            fileName: originalFileName,
            fileSize: optimizedBuffer.length,
          })
          .returning();
      })
      .catch(async (transactionError) => {
        await unlink(diskPath).catch(() => undefined);
        throw transactionError;
      });

    if (!documentation) {
      throw createError({
        statusCode: 500,
        message: "Failed to save documentation metadata",
      });
    }

    return {
      success: true,
      documentation: {
        id: documentation.id,
        filePath: documentation.filePath,
        fileName: documentation.fileName,
        fileSize: documentation.fileSize,
        timestamp: documentation.timestamp.toISOString(),
      },
    };
  } catch (error: any) {
    if (error.statusCode) throw error;

    console.error("Error uploading documentation image:", error);
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to upload documentation image",
    });
  }
});
