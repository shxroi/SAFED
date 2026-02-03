import { db } from '../utils/baseDb'
import { tools } from '../db/schema'
import { and, ilike, or, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) =>{
  const query = getQuery(event)

  const rawPage = parseInt(query.page as string)
  const rawLimit = parseInt(query.limit as string)

  const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage
  const limit = (() => {
    const DEFAULT_LIMIT = 10
    const MAX_LIMIT = 50
    const MIN_LIMIT = 1
 
    if (Number.isNaN(rawLimit)) return DEFAULT_LIMIT
    if (rawLimit < MIN_LIMIT) return MIN_LIMIT
    if (rawLimit > MAX_LIMIT) return MAX_LIMIT
    return rawLimit 
  })()

  const offset = (page - 1) * limit

  const search = typeof query.search === 'string' ? query.search.trim() : ''

  const conditions = []

  if (search) {
    conditions.push(
      or(ilike(tools.name, `%${search}%`))
    )
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined
  
  console.log('Final conditions count:', conditions.length)

  const [rows, totalRes] = await Promise.all([
    db
      .select()
      .from(tools)
      .where(whereClause)
      .orderBy(asc(tools.name))
      .limit(limit)
      .offset(offset),
    db
      .select()
      .from(tools)
      .where(whereClause)
  ])
  
  return {
    tools: rows,
    total: totalRes.length,
    page,
    limit
  }
})