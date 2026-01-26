import { db } from '../../utils/baseDb'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async(event) => {
  const id = Number(getRouterParam(event, 'id'))
  const result = await db.delete(users).where(eq(users.id, id)).returning() 

  return { success: true, message: 'User deleted successfully' }
})