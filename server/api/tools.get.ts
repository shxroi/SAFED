import { db } from "../utils/baseDb";
import { tools } from "../db/schema";
import { asc, count, ilike } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const sessionUser = session?.user as
    | { id?: number | string; roles?: string }
    | undefined;

  if (!sessionUser?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  if (sessionUser.roles !== "IM") {
    throw createError({ statusCode: 403, message: "Forbidden" });
  }

  const query = getQuery(event);

  const rawPage = parseInt(query.page as string);
  const rawLimit = parseInt(query.limit as string);

  const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limit = (() => {
    const DEFAULT_LIMIT = 10;
    const MAX_LIMIT = 200;
    const MIN_LIMIT = 1;

    if (Number.isNaN(rawLimit)) return DEFAULT_LIMIT;
    if (rawLimit < MIN_LIMIT) return MIN_LIMIT;
    if (rawLimit > MAX_LIMIT) return MAX_LIMIT;
    return rawLimit;
  })();

  const offset = (page - 1) * limit;

  const search = typeof query.search === "string" ? query.search.trim() : "";

  const whereClause = search ? ilike(tools.name, `%${search}%`) : undefined;

  const [rows, totalRes] = await Promise.all([
    db
      .select()
      .from(tools)
      .where(whereClause)
      .orderBy(asc(tools.name))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(tools).where(whereClause),
  ]);

  const total = Number(totalRes[0]?.value || 0);

  return {
    tools: rows,
    total,
    page,
    limit,
  };
});
