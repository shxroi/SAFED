import { db } from '../../utils/baseDb'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async(event) => {
  const session = await getUserSession(event)
  const sessionUser = session?.user as { id?: number | string; roles?: string } | undefined

  if (!sessionUser?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  if (sessionUser.roles !== 'IM') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const id = Number(getRouterParam(event, 'id'))
  if (Number.isNaN(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid user ID' })
  }

  const result = await db.delete(users).where(eq(users.id, id)).returning()
  if (result.length === 0) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  return { success: true, message: 'User deleted successfully' }
})
