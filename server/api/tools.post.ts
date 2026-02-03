import { db } from '../utils/baseDb'
import { tools } from '../db/schema'
import { z } from 'zod'
import { th } from 'zod/v4/locales'

const toolCreateSchema = z.object({
  name: z.string().min(1, 'Tool name is required').max(50, 'Tool name must be at most 50 characters long'),
})

export default defineEventHandler(async (event) => {
  try { 
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
    
    const [newTool] = await db.insert(tools).values(result.data).returning()
    return { success: true, data: newTool }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error'
    })
  }
})