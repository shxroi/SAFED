import { db } from '../utils/db';
import { users } from '../db/schema';

export default defineEventHandler(async () => {
  const result = await db.select().from(users)
  return { users: result }
})