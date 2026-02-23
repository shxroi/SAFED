import { db } from '../../utils/baseDb'
import { operations, operationsEnroll, users } from '../../db/schema'
import { and, eq } from 'drizzle-orm'
import { sendOperationScheduleEmail } from '../../utils/operationScheduleEmail'

const EMAIL_COOLDOWN_MS = 30 * 60 * 1000

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

    const shouldSendScheduleEmail =
      status === 'Active' &&
      operation.status !== 'Active' &&
      (!operation.scheduleEmailLastSentAt ||
        Date.now() - operation.scheduleEmailLastSentAt.getTime() > EMAIL_COOLDOWN_MS)

    let scheduleEmailMessage: string | null = null
    let scheduleEmailSent = false

    if (shouldSendScheduleEmail) {
      const [enrolledUsers, observerUsers] = await Promise.all([
        db
          .select({ email: users.email })
          .from(operationsEnroll)
          .innerJoin(users, eq(operationsEnroll.userId, users.id))
          .where(eq(operationsEnroll.operationId, id)),
        db
          .select({ email: users.email })
          .from(users)
          .where(and(eq(users.roles, 'OBSERVER'), eq(users.isActive, true))),
      ])

      const recipients = [
        ...new Set([...enrolledUsers, ...observerUsers].map((user) => user.email).filter(Boolean)),
      ]

      const emailResult = await sendOperationScheduleEmail({
        recipients,
        operation: {
          id: operation.id,
          company: operation.company,
          vesselName: operation.vesselName,
          type: operation.type,
          location: operation.location,
          date: operation.date,
        },
      })

      if (emailResult.sent) {
        scheduleEmailSent = true
        scheduleEmailMessage = 'Schedule email sent'
      } else {
        scheduleEmailMessage = `Schedule email skipped: ${emailResult.reason || 'Unknown reason'}`
      }
    }

    // Update status
    const [updatedOperation] = await db
      .update(operations)
      .set({
        status,
        scheduleEmailLastSentAt: scheduleEmailSent ? new Date() : operation.scheduleEmailLastSentAt,
      })
      .where(eq(operations.id, id))
      .returning()

    return {
      success: true,
      operation: updatedOperation,
      message: `Operation ${status.toLowerCase()} successfully`,
      notification: scheduleEmailMessage,
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
