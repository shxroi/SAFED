import { db } from '../../../utils/baseDb'
import { operationTools, jobsection, operationJobLists, tools as toolsSchema, users } from '../../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const idParam = getRouterParam(event, 'id')

    if (!idParam) {
      throw createError({
        statusCode: 400,
        message: 'Operation ID is required',
      })
    }

    const operationId = parseInt(idParam, 10)

    // Fetch tools with their names and status from the tools table
    const tools = await db
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
      .where(eq(operationTools.operationId, operationId))

    // Fetch sections
    const sections = await db
      .select()
      .from(jobsection)
      .where(eq(jobsection.operationId, operationId))

    // Fetch all activities with executor details
    const activities = await db
      .select({
        id: operationJobLists.id,
        operationId: operationJobLists.operationId,
        jobsectionId: operationJobLists.jobsectionId,
        jobDescription: operationJobLists.jobDescription,
        status: operationJobLists.status,
        notes: operationJobLists.notes,
        executedBy: operationJobLists.executedBy,
        executedByName: users.name,
      })
      .from(operationJobLists)
      .leftJoin(users, eq(operationJobLists.executedBy, users.id))
      .where(eq(operationJobLists.operationId, operationId))

    // Build hierarchical structure
    const formattedSections = sections.map(section => ({
      id: section.id,
      name: section.sectionName,
      modules: [
        {
          id: section.id, // Using section ID as module ID for now as they seem 1:1 in this UI
          name: section.sectionName,
          activities: activities
            .filter((activity: any) => activity.jobsectionId === section.id)
            .map((activity: any) => ({
              id: activity.id,
              jobDescription: activity.jobDescription,
              documentationRequired: false, // Schema doesn't have this?, defaulting
              status: activity.status || null,
              notes: activity.notes || null,
              executedByName: activity.executedByName || null,
            })),
        },
      ],
    }))

    return {
      success: true,
      tools: tools.map(tool => ({
        id: tool.id,
        toolId: tool.toolId,
        name: tool.name || 'Unknown Tool',
        quantity: tool.quantity,
        preStatus: tool.preStatus,
        postStatus: tool.postStatus,
        preNote: tool.preNote,
        postNote: tool.postNote,
      })),
      sections: formattedSections,
    }
  } catch (error: any) {
    console.error('Error fetching checklist:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch checklist',
    })
  }
})