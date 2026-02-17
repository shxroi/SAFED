import { db } from '../../utils/baseDb'
import { tools } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const session = await getUserSession(event)
    const sessionUser = session?.user as { id?: number | string; roles?: string } | undefined

    if (!sessionUser?.id) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }
    if (sessionUser.roles !== 'IM') {
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }

    const id = parseInt(getRouterParam(event, 'id')!)
    if (Number.isNaN(id) || id < 1) {
      throw createError({ statusCode: 400, message: 'Invalid tool ID' })
    }

    const deleted = await db
      .delete(tools)
      .where(eq(tools.id, id))
      .returning()

    if (deleted.length === 0) {
      throw createError({ statusCode: 404, message: 'Tool not found' })
    }

    return { success: true, message: 'Tool deleted successfully' }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: error.message || 'Internal Server Error'
    })
  }
})
