import { z } from 'zod'

export const userCreateSchema = z.object({
  name: z.string()
    .min(1, 'Full name is required')
    .min(3, 'Full name must be at least 3 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Please enter a valid full name')
    .trim(),
  
  username: z.string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  
  password: z.string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),  
  roles: z.string()
    .min(1, 'Role is required'),
  
  isActive: z.boolean().default(false),
})

export const userUpdateSchema = z.object({
  name: z.string()
    .min(1, 'Full name is required')
    .min(3, 'Full name must be at least 3 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Please enter a valid full name')
    .trim()
    .optional(),
  
  username: z.string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .optional(),
  
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .optional(),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .optional()
    .or(z.literal('')),
  
  roles: z.string()
    .min(1, 'Role is required')
    .optional(),
  
  isActive: z.boolean().optional(),
}).strict()

export type UserCreate = z.infer<typeof userCreateSchema>
export type UserUpdate = z.infer<typeof userUpdateSchema>