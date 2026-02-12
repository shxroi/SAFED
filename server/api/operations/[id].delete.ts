import { db } from '../../utils/baseDb'
import { operations, operationsEnroll } from '../../db/schema'
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

    await db.transaction(async (tx) => {
      const [operation] = await tx
        .select()
        .from(operations)
        .where(eq(operations.id, id))

      if (!operation) {
        throw createError({
          statusCode: 404,
          message: 'Operation not found',
        })
      }

      if (operation.status !== 'Draft') {
        throw createError({
          statusCode: 400,
          message: 'Only draft operations can be deleted',
        })
      }

      await tx.delete(operationsEnroll).where(eq(operationsEnroll.operationId, id))
      await tx.delete(operations).where(eq(operations.id, id))
    })

    return {
      success: true,
      message: 'Operation deleted successfully',
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Error deleting operation:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to delete operation',
    })
  }
})
