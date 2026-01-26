import { describe, it, expect } from 'vitest'
import { $fetch } from '@nuxt/test-utils/e2e'

describe('User API', () => {
  it('creates a new user and returns success', async () => {
    const payload = {
      name: 'Test Bot',
      username: 'testbot',
      email: 'bot@test.com',
      password: 'password123',
      roles: 'STAFF'
    }

    const response = await $fetch('/api/users', {
      method: 'POST',
      body: payload
    })

    expect(response.success).toBe(true)
    expect(response.user.username).toBe('testbot')
  })
})