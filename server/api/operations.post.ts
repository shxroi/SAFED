import { baseDb } from '../utils/baseDb'
import { operations, operationsEnroll } from '../db/schema'
import { OPERATION_TYPES } from '../../shared/types/operation'

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
      ? [...new Set(body.staffIds.map((id) => normalizeId(id)).filter((id): id is number => id !== null))]
      : []

    const filteredStaffIds = supervisorId ? staffIds.filter((id) => id !== supervisorId) : staffIds

    const newOperation = await baseDb.transaction(async (tx) => {
      const [created] = await tx
        .insert(operations)
        .values({
          company,
          type: type as any,
          vesselName: body.vesselName?.trim() || null,
          location,
          date: parsedDate,
          status,
        })
        .returning()

      if (!created) {
        throw createError({ statusCode: 500, message: 'Failed to create operation' })
      }

      const enrollments: Array<{ operationId: number; userId: number; operationRole: 'SUPERVISOR' | 'STAFF' }> = []

      if (supervisorId) {
        enrollments.push({
          operationId: created.id,
          userId: supervisorId,
          operationRole: 'SUPERVISOR',
        })
      }

      for (const staffId of filteredStaffIds) {
        enrollments.push({
          operationId: created.id,
          userId: staffId,
          operationRole: 'STAFF',
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
