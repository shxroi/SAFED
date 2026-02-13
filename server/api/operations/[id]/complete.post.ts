import { db } from '../../../utils/baseDb'
import { operations, operationsEnroll } from '../../../db/schema'
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

        if (!idParam) {
            throw createError({
                statusCode: 400,
                message: 'Operation ID is required',
            })
        }

        const operationId = parseInt(idParam, 10)

        // Verify user is enrolled as SUPERVISOR for this operation
        const enrollment = await db
            .select()
            .from(operationsEnroll)
            .where(
                and(
                    eq(operationsEnroll.operationId, operationId),
                    eq(operationsEnroll.userId, userId),
                    eq(operationsEnroll.operationRole, 'SUPERVISOR')
                )
            )
            .limit(1)

        if (!enrollment || enrollment.length === 0) {
            throw createError({
                statusCode: 403,
                message: 'Only supervisors can complete operations',
            })
        }

        // Update operation status to Complete
        await db
            .update(operations)
            .set({ status: 'Complete' })
            .where(eq(operations.id, operationId))

        return {
            success: true,
            message: 'Operation marked as complete',
        }
    } catch (error: any) {
        console.error('Error completing operation:', error)
        throw createError({
            statusCode: error.statusCode || 500,
            message: error.message || 'Failed to complete operation',
        })
    }
})
