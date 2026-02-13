import { db } from '../../../../utils/baseDb'
import { operationJobLists, operationsEnroll } from '../../../../db/schema'
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

        const userId = Number(session.user.id)
        const idParam = getRouterParam(event, 'id')
        const taskIdParam = getRouterParam(event, 'taskId')
        const body = await readBody(event)

        if (!idParam || !taskIdParam) {
            throw createError({
                statusCode: 400,
                message: 'Operation ID and Task ID are required',
            })
        }

        const operationId = parseInt(idParam, 10)
        const taskId = parseInt(taskIdParam, 10)

        // Verify user is enrolled in this operation
        const [enrollment] = await db
            .select()
            .from(operationsEnroll)
            .where(
                and(
                    eq(operationsEnroll.operationId, operationId),
                    eq(operationsEnroll.userId, userId)
                )
            )
            .limit(1)

        if (!enrollment) {
            throw createError({
                statusCode: 403,
                message: 'You are not enrolled in this operation',
            })
        }

        const { status, notes } = body

        // Update the task status and notes
        // We also track who updated it (executedBy)
        await db
            .update(operationJobLists)
            .set({
                status: status || null,
                notes: notes || null,
                executedBy: userId,
            })
            .where(
                and(
                    eq(operationJobLists.id, taskId),
                    eq(operationJobLists.operationId, operationId)
                )
            )

        return {
            success: true,
            message: 'Task updated successfully',
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('Error updating task:', error)
        throw createError({
            statusCode: 500,
            message: error.message || 'Failed to update task',
        })
    }
})
