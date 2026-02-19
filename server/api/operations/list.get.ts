import { db } from "../../utils/baseDb";
import { operations, operationsEnroll, users } from "../../db/schema";
import { eq, inArray, and, like, or, sql, desc } from "drizzle-orm";

type SessionUser = {
  id?: number | string;
  roles?: string;
};

export default defineEventHandler(async (event) => {
  try {
    const session = await getUserSession(event);
    const sessionUser = session?.user as SessionUser | undefined;

    if (!sessionUser?.id) {
      throw createError({
        statusCode: 401,
        message: "Unauthorized",
      });
    }

    const userId = Number(sessionUser.id);
    const query = getQuery(event);

    const search = query.search as string | undefined;
    const type = query.type as string | undefined;
    const date = query.date as string | undefined;
    const myOnly = query.my === 'true';

    // Build where conditions
    const conditions = [eq(operations.status, "Active")];

    if (search) {
      const searchLower = `%${search.toLowerCase()}%`;
      conditions.push(
        or(
          like(sql`lower(${operations.company})`, searchLower),
          like(sql`lower(${operations.vesselName})`, searchLower)
        )!
      );
    }

    if (type && type !== 'ALL') {
      conditions.push(eq(operations.type, type as any));
    }

    if (date) {
      // Assuming date is passed as YYYY-MM-DD
      // We cast the timestamp to date for comparison
      conditions.push(
        sql`DATE(${operations.date}) = ${date}`
      );
    }

    if (myOnly) {
      // Filter for operations where the user is enrolled
      const userEnrollments = await db
        .select({ operationId: operationsEnroll.operationId })
        .from(operationsEnroll)
        .where(eq(operationsEnroll.userId, userId));

      const enrolledIds = userEnrollments.map(e => e.operationId);

      if (enrolledIds.length > 0) {
        conditions.push(inArray(operations.id, enrolledIds));
      } else {
        // If user has no enrollments but requested myOnly, return empty
        return {
          success: true,
          operations: [],
        };
      }
    }

    // Fetch filtered operations
    const filteredOperations = await db
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
      .where(and(...conditions))
      .orderBy(desc(operations.date));

    // Fetch user's enrollments for the filtered operations
    // We still need this to determine the user's role in each operation
    const enrollments = await db
      .select({
        operationId: operationsEnroll.operationId,
        role: operationsEnroll.operationRole,
      })
      .from(operationsEnroll)
      .where(eq(operationsEnroll.userId, userId));

    const enrolledOperationIds = new Set(enrollments.map((e) => e.operationId));
    const enrollmentMap = new Map(
      enrollments.map((e) => [e.operationId, e.role]),
    );

    // For each operation, get supervisor info
    const operationIds = filteredOperations.map((op) => op.id);

    // Only fetch supervisors if we have operations
    let supervisorMap = new Map();

    if (operationIds.length > 0) {
      const supervisors = await db
        .select({
          operationId: operationsEnroll.operationId,
          userId: operationsEnroll.userId,
          userName: users.name,
        })
        .from(operationsEnroll)
        .leftJoin(users, eq(operationsEnroll.userId, users.id))
        .where(
          and(
            inArray(operationsEnroll.operationId, operationIds),
            eq(operationsEnroll.operationRole, "SUPERVISOR"),
          ),
        );

      supervisorMap = new Map(
        supervisors.map((s) => [s.operationId, s.userName || "Unknown"]),
      );
    }

    const operationsWithStatus = filteredOperations.map((op) => ({
      ...op,
      isEnrolled: enrolledOperationIds.has(op.id),
      userRole: enrollmentMap.get(op.id) || null,
      supervisor: supervisorMap.get(op.id) || "Not assigned",
      progress: 0,
    }));

    return {
      success: true,
      operations: operationsWithStatus,
    };
  } catch (error: any) {
    console.error("Error fetching operations:", error);
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to fetch operations",
    });
  }
});
