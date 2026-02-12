import { db } from '../utils/baseDb'
import { operations, operationsEnroll, users, operationJobLists } from '../db/schema'
import { eq, ilike, or, desc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const searchQuery = query.search as string | undefined

    // Build base query
    let whereConditions = []

    // Apply search filter if provided
    if (searchQuery) {
      whereConditions.push(
        or(
          ilike(operations.company, `%${searchQuery}%`),
          ilike(operations.location, `%${searchQuery}%`),
          ilike(operations.vesselName, `%${searchQuery}%`)
        )
      )
    }

    // FIX: Use sql`` for column names that might be snake_case in DB
    const operationsList = await db
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
      .where(whereConditions.length > 0 ? or(...whereConditions) : undefined)
      .orderBy(desc(operations.createdAt))

    // Handle empty results
    if (!operationsList || operationsList.length === 0) {
      return {
        operations: [],
        total: 0,
      }
    }

    // For each operation, get enrollment details
    const operationsWithDetails = await Promise.all(
      operationsList.map(async (op) => {
        // Get enrollments with user details
        const enrollments = await db
          .select({
            id: operationsEnroll.id,
            userId: operationsEnroll.userId,
            operationId: operationsEnroll.operationId,
            operationRole: operationsEnroll.operationRole,
            userName: users.name,
          })
          .from(operationsEnroll)
          .leftJoin(users, eq(operationsEnroll.userId, users.id))
          .where(eq(operationsEnroll.operationId, op.id))

        // Count assigned staff
        const assignedStaff = enrollments.length

        // Get supervisor name
        const supervisor = enrollments.find(e => e.operationRole === 'SUPERVISOR')
        const supervisorName = supervisor?.userName || null

        // Calculate progress from completed jobs
        const completedJobs = await db
          .select({ count: sql<number>`count(*)` })
          .from(operationJobLists)
          .where(eq(operationJobLists.operationId, op.id))
        
        const progress = Number(completedJobs[0]?.count || 0)

        return {
          ...op,
          date: op.date.toISOString(),
          createdAt: op.createdAt.toISOString(),
          assignedStaff,
          supervisorName,
          progress,
        }
      })
    )

    return {
      operations: operationsWithDetails,
      total: operationsWithDetails.length,
    }
  } catch (error: any) {
    console.error('Error fetching operations:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch operations',
    })
  }
})