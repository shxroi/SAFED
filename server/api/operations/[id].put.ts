import { db } from '../../utils/baseDb'
import { operations, operationsEnroll } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const idParam = getRouterParam(event, 'id')
    const body = await readBody(event)
    const { company, type, vesselName, location, date, supervisorId, staffIds } = body

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

    // Validate required fields
    if (!company || !type || !location || !date) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields: company, type, location, and date are required',
      })
    }

    const parsedDate = new Date(date)
    if (Number.isNaN(parsedDate.getTime())) {
      throw createError({
        statusCode: 400,
        message: 'Invalid date',
      })
    }

    const updatedOperation = await db.transaction(async (tx) => {
      const [existingOp] = await tx
        .select()
        .from(operations)
        .where(eq(operations.id, id))

      if (!existingOp) {
        throw createError({
          statusCode: 404,
          message: 'Operation not found',
        })
      }

      if (existingOp.status !== 'Draft') {
        throw createError({
          statusCode: 400,
          message: 'Only draft operations can be edited',
        })
      }

      const [updated] = await tx
        .update(operations)
        .set({
          company,
          type,
          vesselName: vesselName || null,
          location,
          date: parsedDate,
        })
        .where(eq(operations.id, id))
        .returning()

      if (!updated) {
        throw createError({
          statusCode: 500,
          message: 'Failed to update operation',
        })
      }

      await tx.delete(operationsEnroll).where(eq(operationsEnroll.operationId, id))

      const enrollments = []

      if (supervisorId) {
        enrollments.push({
          operationId: updated.id,
          userId: parseInt(supervisorId),
          operationRole: 'SUPERVISOR' as const,
        })
      }

      if (staffIds && Array.isArray(staffIds) && staffIds.length > 0) {
        staffIds.forEach((staffId: number) => {
          enrollments.push({
            operationId: updated.id,
            userId: parseInt(staffId),
            operationRole: 'STAFF' as const,
          })
        })
      }

      if (enrollments.length > 0) {
        await tx.insert(operationsEnroll).values(enrollments)
      }

      return updated
    })

    return {
      success: true,
      operation: updatedOperation,
      message: 'Operation updated successfully',
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Error updating operation:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to update operation',
    })
  }
})
