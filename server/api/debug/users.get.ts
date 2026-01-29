import { db } from '../../utils/baseDb'
import { users } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const allUsers = await db.select().from(users)
  
  return allUsers.map(u => ({
    id: u.id,
    username: u.username,
    // Look for $2b$ at the start of this string in your browser
    passwordFormat: u.password.startsWith('$2b$') ? 'Hashed (Valid)' : 'Plain Text (Invalid)',
    isActive: u.isActive
  }))
})