import { db } from '../utils/baseDb'
import { operations, operationsEnroll } from '../db/schema'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { company, type, vesselName, location, date, supervisorId, staffIds } = body

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

    const newOperation = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(operations)
        .values({
          company,
          type,
          vesselName: vesselName || null,
          location,
          date: parsedDate,
          status: 'Draft',
        })
        .returning()

      if (!created) {
        throw createError({
          statusCode: 500,
          message: 'Failed to create operation',
        })
      }

      const enrollments = []

      if (supervisorId) {
        enrollments.push({
          operationId: created.id,
          userId: parseInt(supervisorId),
          operationRole: 'SUPERVISOR' as const,
        })
      }

      if (staffIds && Array.isArray(staffIds) && staffIds.length > 0) {
        staffIds.forEach((staffId: number) => {
          enrollments.push({
            operationId: created.id,
            userId: parseInt(staffId),
            operationRole: 'STAFF' as const,
          })
        })
      }

      if (enrollments.length > 0) {
        await tx.insert(operationsEnroll).values(enrollments)
      }

      return created
    })

    return {
      success: true,
      operation: newOperation,
      message: 'Operation created successfully',
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Error creating operation:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to create operation',
    })
  }
})
