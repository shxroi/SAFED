import { and, eq } from 'drizzle-orm'
import { db } from '../utils/baseDb'
import { operations, operationsEnroll, users } from '../db/schema'
import { sendNotificationMail } from '../utils/mailer'

type NotificationAction = 'created' | 'updated'

type NotifyOperationDetailSavedParams = {
  operationId: number
  action: NotificationAction
  changedFields?: string[]
}

const formatOperationDate = (value: Date): string => {
  return value.toLocaleDateString('en-US', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const getOperationTitle = (operation: {
  company: string
  vesselName: string | null
}): string => {
  return operation.vesselName || operation.company
}

const getOperationLink = (operationId: number): string | null => {
  const runtimeConfig = useRuntimeConfig()
  const baseUrl = String(runtimeConfig.appBaseUrl || '').trim().replace(/\/$/, '')

  if (!baseUrl) return null
  return `${baseUrl}/operations/${operationId}/execute`
}

export const notifyOperationDetailSaved = async ({
  operationId,
  action,
  changedFields = [],
}: NotifyOperationDetailSavedParams): Promise<void> => {
  const [operation] = await db
    .select({
      id: operations.id,
      company: operations.company,
      vesselName: operations.vesselName,
      type: operations.type,
      location: operations.location,
      date: operations.date,
      status: operations.status,
    })
    .from(operations)
    .where(eq(operations.id, operationId))
    .limit(1)

  if (!operation) return

  const assignedUsers = await db
    .select({
      email: users.email,
      name: users.name,
      operationRole: operationsEnroll.operationRole,
    })
    .from(operationsEnroll)
    .innerJoin(users, eq(operationsEnroll.userId, users.id))
    .where(
      and(
        eq(operationsEnroll.operationId, operationId),
        eq(users.isActive, true)
      )
    )

  const observerUsers = await db
    .select({
      email: users.email,
    })
    .from(users)
    .where(and(eq(users.roles, 'OBSERVER'), eq(users.isActive, true)))

  const recipients = [
    ...new Set(
      [...assignedUsers.map((user) => user.email), ...observerUsers.map((user) => user.email)]
        .map((email) => email.trim())
        .filter((email) => email.length > 0)
    ),
  ]

  if (recipients.length === 0) return

  const supervisor = assignedUsers.find((user) => user.operationRole === 'SUPERVISOR')
  const staffNames = assignedUsers
    .filter((user) => user.operationRole === 'STAFF')
    .map((user) => user.name)

  const actionLabel = action === 'created' ? 'saved' : 'updated'
  const title = getOperationTitle(operation)
  const link = getOperationLink(operationId)

  const textLines = [
    `Operation detail has been ${actionLabel}.`,
    '',
    `Operation: ${operation.type} - ${title}`,
    `Date: ${formatOperationDate(operation.date)}`,
    `Location: ${operation.location}`,
    `Supervisor: ${supervisor?.name || 'Not assigned'}`,
    `Assigned Staff: ${staffNames.length > 0 ? staffNames.join(', ') : 'None'}`,
    `Status: ${operation.status}`,
  ]

  if (action === 'updated' && changedFields.length > 0) {
    textLines.push('', `Updated fields: ${changedFields.join(', ')}`)
  }

  if (link) {
    textLines.push('', `Open operation: ${link}`)
  }

  await sendNotificationMail({
    to: recipients,
    subject: `Operation detail ${actionLabel}: ${operation.type} - ${title}`,
    text: textLines.join('\n'),
  })
}
