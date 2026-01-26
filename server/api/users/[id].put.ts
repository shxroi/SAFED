import { db } from '../../utils/baseDb'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  const [updatedUser] = await db.update(users)
    .set(body)
    .where(eq(users.id, id))
    .returning()

  if (!updatedUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }
  return { success: true, user: updatedUser }
})