import { vi, describe, it, expect, beforeEach } from 'vitest'

// 1. Stub Nuxt/Nitro globals BEFORE any imports
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (err: any) => { throw err }) 
vi.stubGlobal('readBody', vi.fn())
vi.stubGlobal('setUserSession', vi.fn())

// 2. Mock database and password utilities
vi.mock('../../server/utils/baseDb', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  },
}))

vi.mock('../../server/utils/password', () => ({
  verifyPassword: vi.fn(),
}))

// 3. Import mocked dependencies
import { db } from '../../server/utils/baseDb'
import { verifyPassword } from '../../server/utils/password'

describe('Auth: Login API', () => {
  let loginHandler: any
  let readBody: any
  let setUserSession: any

  beforeEach(async () => {
    vi.clearAllMocks()
    // Get references to the stubbed globals
    readBody = global.readBody
    setUserSession = global.setUserSession
    
    // Dynamically import the handler after globals are defined
    const module = await import('../../server/api/auth/login.post')
    loginHandler = module.default
  })

  it('should return 401 for invalid credentials', async () => {
    const mockEvent = {} as any
    vi.mocked(readBody).mockResolvedValue({ username: 'wrong', password: 'password' })
    vi.mocked(db.limit).mockResolvedValue([])

    await expect(loginHandler(mockEvent)).rejects.toMatchObject({
      statusCode: 401,
      data: { auth: expect.stringContaining('Invalid') }
    })
  })

  it('should return 401 if password does not match', async () => {
    const mockEvent = {} as any
    vi.mocked(readBody).mockResolvedValue({ username: 'admin', password: 'wrongpassword' })
    vi.mocked(db.limit).mockResolvedValue([{ 
        id: 1, 
        username: 'admin', 
        password: 'hashed_password',
        isActive: true 
    }])
    vi.mocked(verifyPassword).mockResolvedValue(false)

    await expect(loginHandler(mockEvent)).rejects.toMatchObject({
      statusCode: 401
    })
    expect(verifyPassword).toHaveBeenCalled()
  })

  it('should login successfully with correct credentials', async () => {
    const mockEvent = {} as any
    const mockUser = { 
        id: 1, 
        name: 'Admin', 
        username: 'admin', 
        email: 'admin@safed.id', 
        password: 'hashed_password',
        roles: 'IM',
        isActive: true 
    }

    vi.mocked(readBody).mockResolvedValue({ username: 'admin', password: 'Admin123' })
    vi.mocked(db.limit).mockResolvedValue([mockUser])
    vi.mocked(verifyPassword).mockResolvedValue(true)

    const result = await loginHandler(mockEvent)

    expect(setUserSession).toHaveBeenCalledWith(mockEvent, expect.objectContaining({
      user: expect.objectContaining({
        username: 'admin',
        roles: 'IM'
      })
    }))
    
    expect(result).toMatchObject({
      success: true,
      message: 'Login successful',
      user: expect.objectContaining({
        username: 'admin',
        roles: 'IM'
      })
    })
  })

  it('should return 400 if validation fails (empty fields)', async () => {
    const mockEvent = {} as any
    vi.mocked(readBody).mockResolvedValue({ username: '', password: '' })

    await expect(loginHandler(mockEvent)).rejects.toMatchObject({
      statusCode: 400
    })
  })
})