import { db } from '../../utils/baseDb'
import { operations, operationsEnroll, users } from '../../db/schema'
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

    const id = parseInt(idParam, 10)
    if (Number.isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid Operation ID',
      })
    }

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
