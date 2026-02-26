import { eq, inArray } from "drizzle-orm";
import { baseDb } from "../../../utils/baseDb";
import {
  jobsection,
  operationJobLists,
  operationTools,
  operations,
  tools as toolsSchema,
} from "../../../db/schema";

type ChecklistToolInput = {
  toolId?: number | string | null;
  quantity?: number;
};

type ChecklistActivityInput = {
  description?: string;
  documentationRequired?: boolean;
};

type ChecklistModuleInput = {
  activities?: ChecklistActivityInput[];
};

type ChecklistSectionInput = {
  name?: string;
  modules?: ChecklistModuleInput[];
};

type ChecklistPayload = {
  tools?: ChecklistToolInput[];
  sections?: ChecklistSectionInput[];
};

const normalizeToolId = (
  value: number | string | null | undefined,
): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 1) return null;
  return parsed;
};

const normalizeQuantity = (value: unknown): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
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

    const operationId = parseInt(idParam, 10);
    if (Number.isNaN(operationId) || operationId < 1) {
      throw createError({ statusCode: 400, message: "Invalid operation ID" });
    }

    const body = (await readBody(event)) as ChecklistPayload;
    const rawTools = Array.isArray(body.tools) ? body.tools : [];
    const rawSections = Array.isArray(body.sections) ? body.sections : [];

    const [operation] = await db
      .select({ id: operations.id, status: operations.status })
      .from(operations)
      .where(eq(operations.id, operationId))
      .limit(1);

    if (!operation) {
      throw createError({ statusCode: 404, message: "Operation not found" });
    }

    const normalizedTools = rawTools
      .map((tool) => ({
        toolId: normalizeToolId(tool.toolId),
        quantity: normalizeQuantity(tool.quantity),
      }))
      .filter((tool) => tool.toolId !== null) as Array<{
      toolId: number;
      quantity: number;
    }>;

    const mergedTools = Array.from(
      normalizedTools.reduce((acc, tool) => {
        acc.set(tool.toolId, (acc.get(tool.toolId) || 0) + tool.quantity);
        return acc;
      }, new Map<number, number>()),
    ).map(([toolId, quantity]) => ({ toolId, quantity }));

    await  baseDb.transaction(async (tx) => {
      await tx
        .delete(operationTools)
        .where(eq(operationTools.operationId, operationId));
      await tx
        .delete(operationJobLists)
        .where(eq(operationJobLists.operationId, operationId));
      await tx
        .delete(jobsection)
        .where(eq(jobsection.operationId, operationId));

      if (mergedTools.length > 0) {
        const requestedToolIds = mergedTools.map((tool) => tool.toolId);
        const existingTools = await tx
          .select({ id: toolsSchema.id })
          .from(toolsSchema)
          .where(inArray(toolsSchema.id, requestedToolIds));

        const existingToolIds = new Set(existingTools.map((tool) => tool.id));
        const missingToolId = requestedToolIds.find(
          (toolId) => !existingToolIds.has(toolId),
        );
        if (missingToolId) {
          throw createError({
            statusCode: 400,
            message: `Tool ID ${missingToolId} not found`,
          });
        }

        await tx.insert(operationTools).values(
          mergedTools.map((tool) => ({
            operationId,
            toolId: tool.toolId,
            quantity: tool.quantity,
          })),
        );
      }

      for (const section of rawSections) {
        const sectionName = section.name?.trim();
        if (!sectionName) continue;

        const [insertedSection] = await tx
          .insert(jobsection)
          .values({
            operationId,
            sectionName,
          })
          .returning({ id: jobsection.id });

        if (!insertedSection) continue;

        const modules = Array.isArray(section.modules) ? section.modules : [];
        for (const module of modules) {
          const activities = Array.isArray(module.activities)
            ? module.activities
            : [];
          const activitiesToInsert = activities
            .map((activity) => ({
              jobDescription: activity.description?.trim() || "",
              documentationRequired: !!activity.documentationRequired,
            }))
            .filter((activity) => activity.jobDescription.length > 0)
            .map((activity) => ({
              jobsectionId: insertedSection.id,
              operationId,
              jobDescription: activity.jobDescription,
              documentationRequired: activity.documentationRequired,
            }));

          if (activitiesToInsert.length > 0) {
            await tx.insert(operationJobLists).values(activitiesToInsert);
          }
        }
      }
    });

    return {
      success: true,
      message: "Checklist saved successfully",
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    console.error("Error saving checklist:", error);
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to save checklist",
    });
  }
});
