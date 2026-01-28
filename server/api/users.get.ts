import { db } from '../../server/utils/baseDb'
import { users } from '../../server/db/schema'
import { and, ilike, or, inArray, count, desc } from 'drizzle-orm'

// Helper: Normalize roles from query (handles both string and array)
const normalizeRoles = (rawRoles: unknown): string[] => {
  if (!rawRoles) return []

  if (typeof rawRoles === 'string') {
    return rawRoles
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
  }

  if (Array.isArray(rawRoles)) {
    return rawRoles
      .flatMap((value) =>
        typeof value === 'string'
          ? value.split(',').map((r) => r.trim())
          : []
      )
      .filter((r) => r.length > 0)
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
  const query = getQuery(event)

  // Debug logging - TEMPORARY
  console.log('=== BACKEND DEBUG ===')
  console.log('Raw query object:', query)
  console.log('query.roles type:', typeof query.roles)
  console.log('query.roles value:', query.roles)
  console.log('query.status type:', typeof query.status)
  console.log('query.status value:', query.status)

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

  // Debug logging - TEMPORARY
  console.log('Parsed roles:', roles)
  console.log('Parsed statuses:', statuses)
  console.log('=== END DEBUG ===')

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
    console.log('Applying roles filter with:', roles)
    conditions.push(inArray(users.roles, roles as any))
  }

  if (statuses.length > 0) {
    console.log('Applying statuses filter with:', statuses)
    conditions.push(inArray(users.isActive, statuses))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  console.log('Final conditions count:', conditions.length)

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
    total: totalRes[0].value,
    page,
    limit,
  }
})