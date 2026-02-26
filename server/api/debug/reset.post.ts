import { baseDb } from '../../utils/baseDb'
import { users } from '../../db/schema'
import { hashPassword } from '../../utils/password'

export default defineEventHandler(async (event) => {
  try {
    // 1. Delete ALL users
    await baseDb.delete(users)

    // 2. Create one fresh admin
    const hashedPassword = await hashPassword('Admin123')

    const [newUser] = await baseDb.insert(users).values({
      name: 'System Admin',
      username: 'admin',
      email: 'admin@safed.id',
      password: hashedPassword,
      roles: 'IM',
      isActive: true,
    }).returning()

    return {
      success: true,
      message: 'Database reset successfully',
      user: newUser
    }
  } catch (error: any) {
    throw createError({ statusCode: 500, message: error.message })
  }
})