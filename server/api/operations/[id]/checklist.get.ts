import { baseDb } from "~~/server/utils/baseDb";
import {
  operationTools,
  jobsection,
  operationJobLists,
  tools as toolsSchema,
  users,
  operationsEnroll,
  fieldDocumentations,
} from "../../../db/schema";
import { and, eq, inArray } from "drizzle-orm";

type DocumentationRecord = {
  id: number;
  filePath: string;
  fileName: string;
  fileSize: number;
  timestamp: string;
};

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

    if (sessionUser.roles === "STAFF") {
      const [enrollment] = await baseDb
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
        throw createError({ statusCode: 403, message: "Forbidden" });
      }
    }

    // Fetch tools with their names and status from the tools table
    const tools = await baseDb
      .select({
        id: operationTools.id,
        operationId: operationTools.operationId,
        toolId: operationTools.toolId,
        quantity: operationTools.quantity,
        preStatus: operationTools.preStatus,
        postStatus: operationTools.postStatus,
        preNote: operationTools.preNote,
        postNote: operationTools.postNote,
        name: toolsSchema.name, // Get name from joined tools table
      })
      .from(operationTools)
      .leftJoin(toolsSchema, eq(operationTools.toolId, toolsSchema.id))
      .where(eq(operationTools.operationId, operationId));

    // Fetch sections
    const sections = await baseDb
      .select()
      .from(jobsection)
      .where(eq(jobsection.operationId, operationId));

    // Fetch all activities with executor details
    const activities = await baseDb
      .select({
        id: operationJobLists.id,
        operationId: operationJobLists.operationId,
        jobsectionId: operationJobLists.jobsectionId,
        jobDescription: operationJobLists.jobDescription,
        documentationRequired: operationJobLists.documentationRequired,
        status: operationJobLists.status,
        notes: operationJobLists.notes,
        executedBy: operationJobLists.executedBy,
        executedByName: users.name,
      })
      .from(operationJobLists)
      .leftJoin(users, eq(operationJobLists.executedBy, users.id))
      .where(eq(operationJobLists.operationId, operationId));

    const activityIds = normalizeIds(activities.map((activity) => activity.id));

    let docs: Array<{
      id: number;
      joblistId: number;
      filePath: string;
      fileName: string;
      fileSize: number;
      timestamp: Date;
    }> = [];

    if (activityIds.length > 0) {
      docs = await baseDb
        .select({
          id: fieldDocumentations.id,
          joblistId: fieldDocumentations.joblistId,
          filePath: fieldDocumentations.filePath,
          fileName: fieldDocumentations.fileName,
          fileSize: fieldDocumentations.fileSize,
          timestamp: fieldDocumentations.timestamp,
        })
        .from(fieldDocumentations)
        .where(inArray(fieldDocumentations.joblistId, activityIds));
    }

    const docsByJoblist = docs.reduce(
      (acc, doc) => {
        const key = doc.joblistId;
        if (!acc[key]) {
          acc[key] = [];
        }

        const normalizedDoc: DocumentationRecord = {
          id: doc.id,
          filePath: doc.filePath,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          timestamp: doc.timestamp.toISOString(),
        };

        acc[key].push(normalizedDoc);

        return acc;
      },
      {} as Record<number, DocumentationRecord[]>,
    );

    // Build hierarchical structure
    const formattedSections = sections.map((section) => ({
      id: section.id,
      name: section.sectionName,
      modules: [
        {
          id: section.id,
          name: section.sectionName,
          activities: activities
            .filter((activity) => activity.jobsectionId === section.id)
            .map((activity) => ({
              id: activity.id,
              jobDescription: activity.jobDescription,
              documentationRequired: activity.documentationRequired,
              status: activity.status || null,
              notes: activity.notes || null,
              executedByName: activity.executedByName || null,
              documentations: docsByJoblist[activity.id] || [],
            })),
        },
      ],
    }));

    return {
      success: true,
      tools: tools.map((tool) => ({
        id: tool.id,
        operationId: tool.operationId,
        toolId: tool.toolId,
        name: tool.name || "Unknown Tool",
        quantity: tool.quantity,
        preStatus: tool.preStatus,
        postStatus: tool.postStatus,
        preNote: tool.preNote,
        postNote: tool.postNote,
      })),
      sections: formattedSections,
    };
  } catch (error: any) {
    if (error.statusCode) throw error;

    console.error("Error fetching checklist:", error);
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to fetch checklist",
    });
  }
});
