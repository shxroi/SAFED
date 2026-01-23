import { db } from '../../utils/db'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const [user] = await db.select().from(users).where(eq(users.id, id))

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }
  return { user }
})