import { db } from '../utils/baseDb';
import { users } from '../db/schema';
import { userCreateSchema } from '../../shared/schemas/userSchema';
import { hashPassword } from '../utils/password';
import type { ZodIssue } from 'zod';
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
      const errors: Record<string, string[]> = {}
      result.error.issues.forEach((issue: ZodIssue) => {
        const path = issue.path.join('.')
        if (!errors[path]) {
          errors[path] = []
        }
        errors[path].push(issue.message)
      })

      const fieldErrors: Record<string, string> = {}
      Object.entries(errors).forEach(([field, messages]) => {
        fieldErrors[field] = messages[0] || 'Validation error'
      })

      throw createError({ 
        statusCode: 400, 
        message: 'Validation failed',
        data: fieldErrors
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

    // Hash password before storing
    const hashedPassword = await hashPassword(validatedData.password)

    const insertResult = await db.insert(users).values({
      name: validatedData.name,
      username: validatedData.username,
      email: validatedData.email, 
      password: hashedPassword,
      roles: (Array.isArray(validatedData.roles) ? validatedData.roles[0] : validatedData.roles) as "IM" | "OBSERVER" | "STAFF",
      isActive: true 
    }).returning()

    const newUser = insertResult[0]

    if (!newUser) {
      throw createError({
        statusCode: 500,
        message: 'Internal Server Error: Failed to create user record'
      })
    }

    return { 
      success: true, 
      message: 'User registered successfully', 
      user: {
        id: newUser.id,
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        roles: newUser.roles,
        isActive: newUser.isActive
      } 
    }
  } catch (error: any) {
    // Rethrow H3 errors to avoid wrapping them in 500
    if (error.statusCode) throw error
    
    console.error('Insert Error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to insert user'
    })
  }
})