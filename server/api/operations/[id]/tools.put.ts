import { db } from '../../../utils/baseDb'
import { operationTools, operationsEnroll } from '../../../db/schema'
import { eq, and } from 'drizzle-orm'

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

        // Verify user is enrolled in this operation
        const [enrollment] = await db
            .select()
            .from(operationsEnroll)
            .where(
                and(
                    eq(operationsEnroll.operationId, operationId),
                    eq(operationsEnroll.userId, session.user.id)
                )
            )
            .limit(1)

        if (!enrollment) {
            throw createError({
                statusCode: 403,
                message: 'You are not enrolled in this operation',
            })
        }

        const { tools } = body

        if (!tools || !Array.isArray(tools)) {
            throw createError({
                statusCode: 400,
                message: 'Tools array is required',
            })
        }

        // Update each tool's status
        for (const tool of tools) {
            if (!tool.id) continue

            await db
                .update(operationTools)
                .set({
                    preStatus: tool.preStatus || null,
                    postStatus: tool.postStatus || null,
                    preNote: tool.preNote || null,
                    postNote: tool.postNote || null,
                })
                .where(eq(operationTools.id, tool.id))
        }

        return {
            success: true,
            message: 'Tools updated successfully',
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('Error updating tools:', error)
        throw createError({
            statusCode: 500,
            message: error.message || 'Failed to update tools',
        })
    }
})
