import { eq } from 'drizzle-orm'
import { db } from '../../utils/baseDb'
import { operations, operationsEnroll } from '../../db/schema'
import { OPERATION_TYPES } from '../../../shared/types/operation'

type SessionUser = {
  id?: number | string
  roles?: string
}

type OperationPayload = {
  company?: string
  type?: string
  vesselName?: string | null
  location?: string
  date?: string
  status?: 'Draft' | 'Active'
  supervisorId?: number | string | null
  staffIds?: Array<number | string>
}

const normalizeId = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null

  const parsed = Number(value)
  if (Number.isNaN(parsed) || parsed < 1) return null

  return parsed
}

export default defineEventHandler(async (event) => {
  try {
    const session = await getUserSession(event)
    const sessionUser = session?.user as SessionUser | undefined

    if (!sessionUser?.id) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    if (sessionUser.roles !== 'IM') {
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }

    const idParam = getRouterParam(event, 'id')
    if (!idParam) {
      throw createError({ statusCode: 400, message: 'Operation ID is required' })
    }

    const id = Number(idParam)
    if (Number.isNaN(id) || id < 1) {
      throw createError({ statusCode: 400, message: 'Invalid operation ID' })
    }

    const body = (await readBody(event)) as OperationPayload
    const company = body.company?.trim()
    const type = body.type?.trim()
    const location = body.location?.trim()
    const dateInput = body.date

    if (!company || !type || !location || !dateInput) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields: company, type, location, and date are required',
      })
    }

    if (!OPERATION_TYPES.includes(type as any)) {
      throw createError({ statusCode: 400, message: 'Invalid operation type' })
    }

    const parsedDate = new Date(dateInput)
    if (Number.isNaN(parsedDate.getTime())) {
      throw createError({ statusCode: 400, message: 'Invalid date' })
    }

    const status = body.status === 'Active' ? 'Active' : 'Draft'
    const supervisorId = normalizeId(body.supervisorId)
    const staffIds = Array.isArray(body.staffIds)
      ? [...new Set(body.staffIds.map((staffId) => normalizeId(staffId)).filter((staffId): staffId is number => staffId !== null))]
      : []

    const filteredStaffIds = supervisorId ? staffIds.filter((staffId) => staffId !== supervisorId) : staffIds

    const updatedOperation = await db.transaction(async (tx) => {
      const [existingOperation] = await tx
        .select()
        .from(operations)
        .where(eq(operations.id, id))

      if (!existingOperation) {
        throw createError({ statusCode: 404, message: 'Operation not found' })
      }

      if (existingOperation.status !== 'Draft') {
        throw createError({ statusCode: 400, message: 'Only draft operations can be edited' })
      }

      const [updated] = await tx
        .update(operations)
        .set({
          company,
          type: type as any,
          vesselName: body.vesselName?.trim() || null,
          location,
          date: parsedDate,
          status,
        })
        .where(eq(operations.id, id))
        .returning()

      if (!updated) {
        throw createError({ statusCode: 500, message: 'Failed to update operation' })
      }

      await tx.delete(operationsEnroll).where(eq(operationsEnroll.operationId, id))

      const enrollments: Array<{ operationId: number; userId: number; operationRole: 'SUPERVISOR' | 'STAFF' }> = []

      if (supervisorId) {
        enrollments.push({ operationId: id, userId: supervisorId, operationRole: 'SUPERVISOR' })
      }

      for (const staffId of filteredStaffIds) {
        enrollments.push({ operationId: id, userId: staffId, operationRole: 'STAFF' })
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
