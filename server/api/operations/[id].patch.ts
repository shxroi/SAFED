import { baseDb } from '../../utils/baseDb'
import { operations } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const session = await getUserSession(event)
    const sessionUser = session?.user as { id?: number | string; roles?: string } | undefined

    if (!sessionUser?.id) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    if (sessionUser.roles !== 'IM') {
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }

    const idParam = getRouterParam(event, 'id')
    const body = await readBody(event)
    const { status } = body

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

    if (!status) {
      throw createError({
        statusCode: 400,
        message: 'Status is required',
      })
    }

    const validStatuses = ['Draft', 'Active', 'Complete', 'Cancelled']
    if (!validStatuses.includes(status)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid status value',
      })
    }

    // Check if operation exists
    const [operation] = await baseDb
      .select()
      .from(operations)
      .where(eq(operations.id, id))

    if (!operation) {
      throw createError({
        statusCode: 404,
        message: 'Operation not found',
      })
    }

    const allowedTransitions: Record<string, string[]> = {
      Draft: ['Active', 'Cancelled'],
      Active: ['Complete', 'Cancelled'],
      Complete: [],
      Cancelled: [],
    }

    if (!allowedTransitions[operation.status]?.includes(status)) {
      throw createError({
        statusCode: 400,
        message: `Invalid status transition from ${operation.status} to ${status}`,
      })
    }

    // Update status
    const [updatedOperation] = await baseDb
      .update(operations)
      .set({ status })
      .where(eq(operations.id, id))
      .returning()

    return {
      success: true,
      operation: updatedOperation,
      message: `Operation ${status.toLowerCase()} successfully`,
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Error updating operation status:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to update operation status',
    })
  }
})
