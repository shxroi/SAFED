import { db } from '../utils/baseDb'
import { users } from '../db/schema'
import { and, ilike, or, inArray, count, desc } from 'drizzle-orm'

type UserRole = 'IM' | 'OBSERVER' | 'STAFF'
const USER_ROLES: UserRole[] = ['IM', 'OBSERVER', 'STAFF']

// Helper: Normalize roles from query (handles both string and array)
const normalizeRoles = (rawRoles: unknown): UserRole[] => {
  if (!rawRoles) return []

  const parseValues = (values: string[]): UserRole[] => {
    return values
      .map((r) => r.trim())
      .filter((r): r is UserRole => USER_ROLES.includes(r as UserRole))
  }

  if (typeof rawRoles === 'string') {
    return parseValues(rawRoles.split(','))
  }

  if (Array.isArray(rawRoles)) {
    return parseValues(rawRoles
      .flatMap((value) =>
        typeof value === 'string'
          ? value.split(',').map((r) => r.trim())
          : []
      )
    )
  }

  return []
}

// Helper: Normalize and validate status values
const normalizeStatuses = (rawStatus: unknown): boolean[] => {
  if (!rawStatus) return []

  const validValues = ['true', 'false']
  
  let values: string[] = []

  if (typeof rawStatus === 'string') {
    values = rawStatus.split(',').map((s) => s.trim())
  } else if (Array.isArray(rawStatus)) {
    values = rawStatus
      .flatMap((v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()) : []))
  }

  return values
    .filter((s) => validValues.includes(s))
    .map((s) => s === 'true')
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const sessionUser = session?.user as { id?: number | string; roles?: string } | undefined

  if (!sessionUser?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  if (sessionUser.roles !== 'IM') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const query = getQuery(event)

  // --- Pagination with clamping ---
  const rawPage = parseInt(query.page as string)
  const rawLimit = parseInt(query.limit as string)

  const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage
  const limit = (() => {
    const DEFAULT_LIMIT = 10
    const MAX_LIMIT = 100
    const MIN_LIMIT = 1

    if (Number.isNaN(rawLimit)) return DEFAULT_LIMIT
    if (rawLimit < MIN_LIMIT) return MIN_LIMIT
    if (rawLimit > MAX_LIMIT) return MAX_LIMIT
    return rawLimit
  })()

  const offset = (page - 1) * limit

  // --- Filter parsing ---
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const roles = normalizeRoles(query.roles)
  const statuses = normalizeStatuses(query.status)

  // --- Build conditions ---
  const conditions = []

  if (search) {
    conditions.push(
      or(
        ilike(users.name, `%${search}%`),
        ilike(users.username, `%${search}%`),
        ilike(users.email, `%${search}%`)
      )
    )
  }

  if (roles.length > 0) {
    conditions.push(inArray(users.roles, roles))
  }

  if (statuses.length > 0) {
    conditions.push(inArray(users.isActive, statuses))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // --- Execute queries ---
  const [rows, totalRes] = await Promise.all([
    db
      .select()
      .from(users)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(users.id)),
    db
      .select({ value: count() })
      .from(users)
      .where(whereClause),
  ])

  return {
    users: rows,
    total: totalRes[0]?.value ?? 0,
    page,
    limit,
  }
})
