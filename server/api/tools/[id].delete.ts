import { db } from '../../utils/baseDb'
import { tools } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)

    await db
      .delete(tools)
      .where(eq(tools.id, id))

    return { success: true, message: 'Tool deleted successfully' }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error'
    })
  }
})