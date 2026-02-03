import { db } from '../../utils/baseDb'
import { tools } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const toolSchema = z.object({
  name: z.string().min(1, 'Tool name is required').max(50, 'Tool name must be at most 50 characters long'),
})

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)
    const result = toolSchema.safeParse(body)

    if (!id) {
      throw createError({ statusCode: 400, message: 'Tool ID is required' })
    }

    if (!body) {
      throw createError({ statusCode: 400, message: 'Missing request body' })
    }

    if (!result.success) {
      throw createError({ 
        statusCode: 400, 
        message: 'Validation failed',
        data: result.error.flatten().fieldErrors
      })
    }

    const [updated] = await db
    .update(tools)
    .set(result.data)
    .where(eq(tools.id, id))
    .returning()

    if (!updated) {
      throw createError({ statusCode: 404, message: 'Tool not found' })
    }

    return { success: true, data: updated }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error'
    })
  }
})