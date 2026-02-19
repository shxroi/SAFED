import { db } from '../../utils/baseDb'
import { operations, operationsEnroll, users } from '../../db/schema'
import { and, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const session = await getUserSession(event)
    const sessionUser = session?.user as { id?: number | string; roles?: string } | undefined

    if (!sessionUser?.id) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const idParam = getRouterParam(event, 'id')

    if (!idParam) {
      throw createError({
        statusCode: 400,
        message: 'Operation ID is required',
      })
    }

    const id = parseInt(idParam, 10)
    if (Number.isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid Operation ID',
      })
    }

    const userId = Number(sessionUser.id)

    // Get operation
    const [operation] = await db
      .select()
      .from(operations)
      .where(eq(operations.id, id))

    if (!operation) {
      throw createError({
        statusCode: 404,
        message: 'Operation not found',
      })
    }

    if (sessionUser.roles === 'STAFF') {
      const [userEnrollment] = await db
        .select({ id: operationsEnroll.id })
        .from(operationsEnroll)
        .where(and(eq(operationsEnroll.operationId, id), eq(operationsEnroll.userId, userId)))
        .limit(1)

      if (!userEnrollment) {
        throw createError({ statusCode: 403, message: 'Forbidden' })
      }
    }

    // Get enrollments with user details
    const enrollments = await db
      .select({
        id: operationsEnroll.id,
        userId: operationsEnroll.userId,
        operationId: operationsEnroll.operationId,
        operationRole: operationsEnroll.operationRole,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(operationsEnroll)
      .leftJoin(users, eq(operationsEnroll.userId, users.id))
      .where(eq(operationsEnroll.operationId, id))

    return {
      operation: {
        ...operation,
        date: operation.date.toISOString(),
        createdAt: operation.createdAt.toISOString(),
        enrollments,
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Error fetching operation:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch operation',
    })
  }
})
