import { db } from '../../utils/baseDb'
import { operations, operationsEnroll, users } from '../../db/schema'
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

        const userId = Number(session.user.id)

        // Fetch all active operations
        const allOperations = await db
            .select({
                id: operations.id,
                company: operations.company,
                type: operations.type,
                vesselName: operations.vesselName,
                location: operations.location,
                date: operations.date,
                status: operations.status,
                createdAt: operations.createdAt,
            })
            .from(operations)
            .where(eq(operations.status, 'Active'))

        // Fetch user's enrollments
        const enrollments = await db
            .select({
                operationId: operationsEnroll.operationId,
                role: operationsEnroll.operationRole,
            })
            .from(operationsEnroll)
            .where(eq(operationsEnroll.userId, userId))

        const enrolledOperationIds = new Set(enrollments.map(e => e.operationId))
        const enrollmentMap = new Map(enrollments.map(e => [e.operationId, e.role]))

        // For each operation, get supervisor info
        const operationIds = allOperations.map(op => op.id)

        const supervisors = await db
            .select({
                operationId: operationsEnroll.operationId,
                userId: operationsEnroll.userId,
                userName: users.name,
            })
            .from(operationsEnroll)
            .leftJoin(users, eq(operationsEnroll.userId, users.id))
            .where(
                inArray(operationsEnroll.operationId, operationIds.length > 0 ? operationIds : [0])
            )
            .where(eq(operationsEnroll.operationRole, 'SUPERVISOR'))

        const supervisorMap = new Map(
            supervisors.map(s => [s.operationId, s.userName || 'Unknown'])
        )

        // TODO: Calculate progress based on completed tools/tasks
        // For now, return 0% progress
        const operationsWithStatus = allOperations.map(op => ({
            ...op,
            isEnrolled: enrolledOperationIds.has(op.id),
            userRole: enrollmentMap.get(op.id) || null,
            supervisor: supervisorMap.get(op.id) || 'Not assigned',
            progress: 0, // TODO: Calculate actual progress
        }))

        return {
            success: true,
            operations: operationsWithStatus,
        }
    } catch (error: any) {
        console.error('Error fetching operations:', error)
        throw createError({
            statusCode: 500,
            message: error.message || 'Failed to fetch operations',
        })
    }
})
