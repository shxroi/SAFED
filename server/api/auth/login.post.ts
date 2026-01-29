import { db } from '../../utils/baseDb';
import { users } from '../../db/schema';
import { loginSchema } from '../../../shared/schemas/userSchema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '../../utils/password';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    // Only reject null/undefined, allow empty objects for Zod validation
    if (body == null) {
      throw createError({ statusCode: 400, message: 'Missing request body' })
    }

    // --- Validate with Zod ---
    const result = loginSchema.safeParse(body)

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

    const { username, password } = result.data

    // --- Find user by username (query only once!) ---
    const [foundUser] = await db.select().from(users)
      .where(eq(users.username, username))
      .limit(1)

    if (!foundUser) {
      throw createError({
        statusCode: 401,
        message: 'Invalid username or password',
        data: { auth: 'Invalid username or password.' }
      })
    }

    // --- Check if account is active ---
    if (!foundUser.isActive) {
      throw createError({
        statusCode: 403,
        message: 'Account inactive',
        data: { auth: 'Your account is inactive. Please contact the administrator.' }
      })
    }

    // Use bcrypt for constant-time password comparison (secure)
    const passwordMatch = await verifyPassword(password, foundUser.password)
    
    if (!passwordMatch) {
      throw createError({
        statusCode: 401,
        message: 'Invalid username or password',
        data: { auth: 'Invalid username or password.' }
      })
    }

    // --- Create session/token ---
    await setUserSession(event, {
      user: {
        id: foundUser.id,
        name: foundUser.name,
        username: foundUser.username,
        email: foundUser.email,
        roles: foundUser.roles,
        isActive: foundUser.isActive,
      }
    })

    return {
      success: true,
      message: 'Login successful',
      user: {
        id: foundUser.id,
        name: foundUser.name,
        username: foundUser.username,
        email: foundUser.email,
        roles: foundUser.roles,
        isActive: foundUser.isActive,
      }
    }
  } catch (error: any) {
    // Check if error is already an H3Error and rethrow as-is
    if (error.statusCode) {
      // Already an H3Error from createError, rethrow it
      throw error
    }
    
    console.error('Login Error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Login failed',
      data: error.data
    })
  }
})