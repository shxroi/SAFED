import { db } from '../../utils/baseDb';
import { users } from '../../db/schema';
import { userUpdateSchema } from '../../../shared/schemas/userSchema';
import { eq, and, ne } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!id) {
      throw createError({ statusCode: 400, message: 'User ID is required' })
    }

    if (!body) {
      throw createError({ statusCode: 400, message: 'Missing request body' })
    }

    const userId = parseInt(id)

    // --- Validate with Zod ---
    const result = userUpdateSchema.safeParse(body)

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

    // --- Build update object (only include fields that are provided) ---
    const updateData: any = {}
    
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.email !== undefined) updateData.email = validatedData.email
    if (validatedData.username !== undefined) updateData.username = validatedData.username
    if (validatedData.roles !== undefined) updateData.roles = validatedData.roles
    if (validatedData.password !== undefined) updateData.password = validatedData.password
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive

    // --- Check if there's anything to update ---
    if (Object.keys(updateData).length === 0) {
      throw createError({
        statusCode: 400,
        message: 'No fields to update',
        data: { general: 'Please provide at least one field to update' }
      })
    }

    // --- Check for duplicate email (exclude current user) ---
    if (validatedData.email) {
      const existingEmail = await db.select().from(users)
        .where(and(
          eq(users.email, validatedData.email),
          ne(users.id, userId)
        ))
        .limit(1)
      
      if (existingEmail.length > 0) {
        throw createError({
          statusCode: 400,
          message: 'Validation failed',
          data: { email: 'This email is already registered' }
        })
      }
    }

    // --- Check for duplicate username (exclude current user) ---
    if (validatedData.username) {
      const existingUsername = await db.select().from(users)
        .where(and(
          eq(users.username, validatedData.username),
          ne(users.id, userId)
        ))
        .limit(1)
      
      if (existingUsername.length > 0) {
        throw createError({
          statusCode: 400,
          message: 'Validation failed',
          data: { username: 'This username is already taken' }
        })
      }
    }

    const [updatedUser] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning()

    return { 
      success: true, 
      message: 'User updated successfully', 
      user: updatedUser 
    }
  } catch (error: any) {
    console.error('Update Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to update user',
      data: error.data
    })
  }
})