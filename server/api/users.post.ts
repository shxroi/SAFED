import { db } from '../utils/db';
import { users } from '../db/schema';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
  
  console.log('Received body:', body)

  if (!body) {
    throw createError({ statusCode: 400, message: 'Missing request body' })
  }

  const [newUser] = await db.insert(users).values({
  name: body.name,
  username: body.username,
  email: body.email, 
  password: body.password,
  roles: body.roles, 
}).returning()

  return { 
    success: true, 
    message: 'User registered successfully', 
    user: newUser 
  }
} catch (error: any) {
    console.error('Insert Error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to insert user'
    })
  }
})