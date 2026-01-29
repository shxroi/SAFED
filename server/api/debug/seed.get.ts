import { db } from '../../utils/baseDb'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    // 1. Cek apakah sudah ada data dummy (ceki user pertama 'alicej')
    const [existing] = await db.select().from(users).where(eq(users.username, 'alicej')).limit(1)
    if (existing) return { success: false, message: 'Dummy data already seeded' }

    // 2. Data dari SQL yang Anda berikan (Password: Password123)
    const dummyData = [
      { name: 'Alice Johnson', username: 'alicej', email: 'alice@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'STAFF', isActive: true },
      { name: 'Bob Smith', username: 'bobsmith', email: 'bob@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'OBSERVER', isActive: true },
      { name: 'Charlie Brown', username: 'charlieb', email: 'charlie@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'STAFF', isActive: false },
      { name: 'Diana Prince', username: 'dianap', email: 'diana@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'OBSERVER', isActive: true },
      { name: 'George Miller', username: 'georgem', email: 'george@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'OBSERVER', isActive: false },
      { name: 'Julia Roberts', username: 'juliar', email: 'julia@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'OBSERVER', isActive: true },
      { name: 'Kevin Hart', username: 'kevinh', email: 'kevin@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'STAFF', isActive: true },
      { name: 'Mike Tyson', username: 'miket', email: 'mike@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'OBSERVER', isActive: false },
      { name: 'Nina Simone', username: 'ninas', email: 'nina@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'STAFF', isActive: true },
      { name: 'Oscar Wilde', username: 'oscarw', email: 'oscar@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'STAFF', isActive: true },
      { name: 'Peter Parker', username: 'peterp', email: 'peter@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'OBSERVER', isActive: true },
      { name: 'Tony Stark', username: 'tonys', email: 'tony@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'STAFF', isActive: true },
      { name: 'Victor Hugo', username: 'victorh', email: 'victor@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'OBSERVER', isActive: true },
      { name: 'Arthur Morgan', username: 'arthurm', email: 'arthur@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'STAFF', isActive: true },
      { name: 'Billie Eilish', username: 'billiee', email: 'billie@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'OBSERVER', isActive: false },
      { name: 'Chris Evans', username: 'chrise', email: 'chris@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'STAFF', isActive: true },
      { name: 'Franklin Clinton', username: 'franklinc', email: 'franklin@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'STAFF', isActive: true },
      { name: 'Joel Miller', username: 'joelm', email: 'joel@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'OBSERVER', isActive: true },
      { name: 'Kratos Sparda', username: 'kratoss', email: 'kratos@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'STAFF', isActive: true },
      { name: 'Lara Croft', username: 'larac', email: 'lara@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'STAFF', isActive: true },
      { name: 'Master Chief', username: 'masterc', email: 'master@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'OBSERVER', isActive: true },
      { name: 'Nathan Drake', username: 'nathand', email: 'nathan@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'STAFF', isActive: false },
      { name: 'Trevor Philips', username: 'trevorp', email: 'trevor@example.com', password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', roles: 'OBSERVER', isActive: true },
    ]

    // 3. Masukkan data (Batch insert)
    await db.insert(users).values(dummyData as any)

    return {
      success: true,
      message: '40 Dummy users created successfully',
      passwordTip: 'Password for all users is: Password123'
    }
  } catch (error: any) {
    throw createError({ statusCode: 500, message: error.message })
  }
})