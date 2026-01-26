import { describe, it, expect } from 'vitest'

const mockUsers = [
  { name: 'John Doe', roles: 'STAFF', username: 'john' },
  { name: 'Jane Observer', roles: 'OBSERVER', username: 'jane' }
]

describe('User Filter Utility', () => {
  it('filters by search query', () => {
    const query = 'john'
    const filtered = mockUsers.filter(u => 
      u.name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query)
    )
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe('John Doe')
  })

  it('filters by role', () => {
    const role = 'OBSERVER'
    const filtered = mockUsers.filter(u => u.roles === role)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].roles).toBe('OBSERVER')
  })
})