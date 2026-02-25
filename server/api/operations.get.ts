import { and, desc, eq, gte, ilike, lte, or } from 'drizzle-orm'
import { db } from '../utils/baseDb'
import { operationJobLists, operations, operationsEnroll, operationTools, users } from '../db/schema'
import {
  OPERATION_STATUSES,
  OPERATION_TYPES,
  type OperationRole,
  type OperationStatus,
  type OperationType,
} from '../../shared/types/operation'

type SessionUser = {
  id?: number | string
  roles?: string
}

const parseDateFilter = (value: unknown): { start: Date; end: Date } | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return null

  const [yearString, monthString, dayString] = value.split('-')
  const year = Number(yearString)
  const month = Number(monthString)
  const day = Number(dayString)

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    year < 1900 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null
  }

  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))

  return { start, end }
}

const parseTypeFilter = (value: unknown): OperationType[] | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return []

  const values = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  if (values.length === 0) return []

  const hasInvalid = values.some((item) => !OPERATION_TYPES.includes(item as OperationType))
  if (hasInvalid) return null

  return [...new Set(values)] as OperationType[]
}

const parseStatusFilter = (value: unknown): OperationStatus[] | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return []

  const values = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  if (values.length === 0) return []

  const hasInvalid = values.some((item) => !OPERATION_STATUSES.includes(item as OperationStatus))
  if (hasInvalid) return null

  return [...new Set(values)] as OperationStatus[]
}

const calculateProgress = (
  tools: Array<{ preStatus: 'Good' | 'Not Good' | null; postStatus: 'Good' | 'Not Good' | null }>,
  tasks: Array<{ status: 'Good' | 'Not Good' | null }>
): number => {
  const totalToolChecks = tools.length * 2
  const completedToolChecks = tools.reduce((total, tool) => {
    if (tool.preStatus) total += 1
    if (tool.postStatus) total += 1
    return total
  }, 0)

  const totalTaskChecks = tasks.length
  const completedTaskChecks = tasks.reduce((total, task) => (task.status ? total + 1 : total), 0)

  const totalChecks = totalToolChecks + totalTaskChecks
  if (totalChecks === 0) return 0

  return Math.round(((completedToolChecks + completedTaskChecks) / totalChecks) * 100)
}

export default defineEventHandler(async (event) => {
  try {
    const session = await getUserSession(event)
    const sessionUser = session?.user as SessionUser | undefined

    if (!sessionUser?.id) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const query = getQuery(event)
    const searchQuery = typeof query.search === 'string' ? query.search.trim() : ''
    const typeFilter = parseTypeFilter(query.type)
    const dateFilter = parseDateFilter(query.date)
    const statusFilter = parseStatusFilter(query.status)
    const userRole = sessionUser.roles
    const userId = Number(sessionUser.id)

    const conditions: any[] = []

    if (searchQuery) {
      conditions.push(
        or(
          ilike(operations.company, `%${searchQuery}%`),
          ilike(operations.location, `%${searchQuery}%`),
          ilike(operations.vesselName, `%${searchQuery}%`)
        )
      )
    }

    if (typeFilter === null) {
      return {
        operations: [],
        total: 0,
      }
    }

    if (statusFilter === null) {
      return {
        operations: [],
        total: 0,
      }
    }

    if (typeFilter.length > 0) {
      conditions.push(or(...typeFilter.map((type) => eq(operations.type, type as any))))
    }

    if (dateFilter) {
      conditions.push(and(gte(operations.date, dateFilter.start), lte(operations.date, dateFilter.end)))
    }

    if (statusFilter.length > 0) {
      conditions.push(or(...statusFilter.map((status) => eq(operations.status, status as any))))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const operationsList = userRole === 'STAFF'
      ? await db
          .select({
            id: operations.id,
            company: operations.company,
            type: operations.type,
            vesselName: operations.vesselName,
            location: operations.location,
            date: operations.date,
            status: operations.status,
            createdAt: operations.createdAt,
          })
          .from(operations)
          .innerJoin(operationsEnroll, eq(operationsEnroll.operationId, operations.id))
          .where(
            whereClause
              ? and(eq(operationsEnroll.userId, userId), whereClause)
              : eq(operationsEnroll.userId, userId)
          )
          .orderBy(desc(operations.createdAt))
      : await db
          .select({
            id: operations.id,
            company: operations.company,
            type: operations.type,
            vesselName: operations.vesselName,
            location: operations.location,
            date: operations.date,
            status: operations.status,
            createdAt: operations.createdAt,
          })
          .from(operations)
          .where(whereClause)
          .orderBy(desc(operations.createdAt))

    const operationsWithDetails = await Promise.all(
      operationsList.map(async (operation) => {
        const [enrollments, tools, tasks] = await Promise.all([
          db
            .select({
              userId: operationsEnroll.userId,
              operationRole: operationsEnroll.operationRole,
              userName: users.name,
            })
            .from(operationsEnroll)
            .leftJoin(users, eq(operationsEnroll.userId, users.id))
            .where(eq(operationsEnroll.operationId, operation.id)),
          db
            .select({
              preStatus: operationTools.preStatus,
              postStatus: operationTools.postStatus,
            })
            .from(operationTools)
            .where(eq(operationTools.operationId, operation.id)),
          db
            .select({ status: operationJobLists.status })
            .from(operationJobLists)
            .where(eq(operationJobLists.operationId, operation.id)),
        ])

        const supervisor = enrollments.find((enrollment) => enrollment.operationRole === 'SUPERVISOR')
        const assignedStaff = enrollments.filter((enrollment) => enrollment.operationRole === 'STAFF').length
        const isEnrolled = enrollments.some((enrollment) => enrollment.userId === userId)

        return {
          ...operation,
          date: operation.date.toISOString(),
          createdAt: operation.createdAt.toISOString(),
          assignedStaff,
          supervisorName: supervisor?.userName || null,
          progress: calculateProgress(tools, tasks),
          isEnrolled,
          userRole: enrollments.find((enrollment) => enrollment.userId === userId)?.operationRole as OperationRole | undefined,
        }
      })
    )

    return {
      operations: operationsWithDetails,
      total: operationsWithDetails.length,
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error fetching operations:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch operations',
    })
  }
})
