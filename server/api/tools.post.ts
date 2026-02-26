import { baseDb } from '../utils/baseDb'
import { tools } from '../db/schema'
import { z } from 'zod'

const toolCreateSchema = z.object({
  name: z.string().min(1, 'Tool name is required').max(50, 'Tool name must be at most 50 characters long'),
})

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

    const body = await readBody(event)
    const result = toolCreateSchema.safeParse(body)

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
    
    const [newTool] = await baseDb.insert(tools).values(result.data).returning()
    return { success: true, data: newTool }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error'
    })
  }
})
