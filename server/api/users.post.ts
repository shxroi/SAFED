import { db } from '../utils/baseDb';
import { users } from '../db/schema';
import { userCreateSchema } from '../../shared/schemas/userSchema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
  
    if (!body) {
      throw createError({ statusCode: 400, message: 'Missing request body' })
    }

    // --- Validate with Zod ---
    const result = userCreateSchema.safeParse(body)

    if (!result.success) {
      const errors: Record<string, string> = {}
      result.error.issues.forEach((issue: any) => {
        const path = issue.path.join('.')
        errors[path] = issue.message
      })

      throw createError({ 
        statusCode: 400, 
        message: 'Validation failed',
        data: errors
      })
    }

    const validatedData = result.data

    // --- Check for duplicate email ---
    const existingEmail = await db.select().from(users).where(eq(users.email, validatedData.email)).limit(1)
    if (existingEmail.length > 0) {
      throw createError({
        statusCode: 400,
        message: 'Validation failed',
        data: { email: 'This email is already registered' }
      })
    }

    // --- Check for duplicate username ---
    const existingUsername = await db.select().from(users).where(eq(users.username, validatedData.username)).limit(1)
    if (existingUsername.length > 0) {
      throw createError({
        statusCode: 400,
        message: 'Validation failed',
        data: { username: 'This username is already taken' }
      })
    }

    const [newUser] = await db.insert(users).values({
      name: validatedData.name,
      username: validatedData.username,
      email: validatedData.email, 
      password: validatedData.password,
      roles: validatedData.roles as "IM" | "OBSERVER" | "STAFF", 
    }).returning()

    return { 
      success: true, 
      message: 'User registered successfully', 
      user: newUser 
    }
  } catch (error: any) {
    console.error('Insert Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to insert user',
      data: error.data
    })
  }
})