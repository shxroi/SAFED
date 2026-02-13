import { db } from '../../../utils/baseDb'
import { operationTools, jobsection, operationJobLists, tools as toolsSchema, operationsEnroll } from '../../../db/schema'
import { eq, inArray, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const session = await getUserSession(event)

    if (!session?.user?.id) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized',
      })
    }

    const idParam = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!idParam) {
      throw createError({
        statusCode: 400,
        message: 'Operation ID is required',
      })
    }

    const operationId = parseInt(idParam, 10)

    // Authorization Check
    // 1. IM can always edit
    const isIM = session.user.roles === 'IM'

    // 2. Supervisors can edit their own operations
    let isSupervisor = false
    if (!isIM) {
      const [enrollment] = await db
        .select()
        .from(operationsEnroll)
        .where(
          and(
            eq(operationsEnroll.operationId, operationId),
            eq(operationsEnroll.userId, Number(session.user.id)),
            eq(operationsEnroll.operationRole, 'SUPERVISOR')
          )
        )
        .limit(1)

      if (enrollment) {
        isSupervisor = true
      }
    }

    if (!isIM && !isSupervisor) {
      throw createError({
        statusCode: 403,
        message: 'Only IM or Supervisors can modify the checklist',
      })
    }

    const { tools, sections } = body

    await db.transaction(async (tx) => {
      // 1. Delete existing checklist data in correct order (children first, then parents)
      await tx.delete(operationTools).where(eq(operationTools.operationId, operationId))
      await tx.delete(operationJobLists).where(eq(operationJobLists.operationId, operationId))
      await tx.delete(jobsection).where(eq(jobsection.operationId, operationId))

      // 2. Insert tools
      if (tools && Array.isArray(tools) && tools.length > 0) {
        // First ensure all tools exist in the 'tools' master table or get their IDs
        // We need to handle both pre-existing tools (with IDs) and new ad-hoc tools?
        // The schema for `operationTools` requires `toolId` which references `tools.id`.
        // So we MUST insert into `tools` first if it doesn't exist, OR fail.
        // For this implementation, we will try to find existing tools by name, insert if missing, then link.

        const toolsToProcess = tools.filter((t: any) => t.name && t.name.trim());

        if (toolsToProcess.length > 0) {
          const toolNames = toolsToProcess.map((t: any) => t.name.trim());

          // Find existing tools
          // Note: This logic assumes tool names are unique enough or we just pick one.
          // A better approach for a real app would be to have the frontend send IDs for selected tools.
          // But since the UI allows adding "Tools" which might be free-text, we handle it here.

          // Actually, let's keep it simple for now:
          // If the frontend sends an ID, use it.
          // If not, we probably need to create it in `tools` table first?
          // The `tools` schema is just `id` and `name`.

          // Let's create a map of name -> id
          // 1. Find all tools with these names
          // ERROR: inArray requires a non-empty array.

          // To simplify and avoid complexity with "creating new tools on the fly" which might clutter the master list:
          // We will assume that for now, we only support tools that HAVE an ID (selected from dropdown) OR we auto-create them.
          // Given the requirement "can add tools by selecting from the tools data", it implies we select existing ones.
          // However, the UI `create.vue` allows typing a name.
          // Let's try to find or create.

          const toolMap = new Map<string, number>();

          // Get existing tools
          const existingTools = await tx
            .select()
            .from(toolsSchema)
            .where(inArray(toolsSchema.name, toolNames));

          existingTools.forEach(t => toolMap.set(t.name, t.id));

          // Create missing tools
          // Create missing tools
          for (const name of toolNames) {
            if (!toolMap.has(name)) {
              const newTools = await tx
                .insert(toolsSchema)
                .values({ name })
                .returning();

              const newTool = newTools[0]
              if (newTool) {
                toolMap.set(newTool.name, newTool.id);
              }
            }
          }

          const toolsToInsert = toolsToProcess.map((tool: any) => ({
            operationId,
            toolId: toolMap.get(tool.name.trim())!, // Should exist now
            quantity: tool.quantity || 1,
          }));

          if (toolsToInsert.length > 0) {
            await tx.insert(operationTools).values(toolsToInsert);
          }
        }
      }

      // 3. Insert sections (modules) and activities (joblist)
      if (sections && Array.isArray(sections) && sections.length > 0) {
        for (const section of sections) {
          if (!section.name || !section.name.trim()) continue

          // Insert jobsection (module)
          const insertedSections = await tx
            .insert(jobsection)
            .values({
              operationId,
              sectionName: section.name,
            })
            .returning()

          const insertedSection = insertedSections[0]

          if (!insertedSection) continue

          // Insert activities for this section
          if (section.modules && Array.isArray(section.modules)) {
            for (const module of section.modules) {
              if (module.activities && Array.isArray(module.activities)) {
                const activitiesToInsert = module.activities
                  .filter((activity: any) => activity.description && activity.description.trim())
                  .map((activity: any) => ({
                    jobsectionId: insertedSection.id,
                    operationId,
                    jobDescription: activity.description,
                    // status will be null until staff performs the operation
                  }))

                if (activitiesToInsert.length > 0) {
                  await tx.insert(operationJobLists).values(activitiesToInsert)
                }
              }
            }
          }
        }
      }
    })

    return {
      success: true,
      message: 'Checklist saved successfully',
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Error saving checklist:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to save checklist',
    })
  }
})