import type { LoginInput } from '../../shared/schemas/userSchema'
import type { User } from '../../shared/types/user'

export const useAuth = () => {
  const user = useState<User | null>('auth.user', () => null)
  const loading = useState('auth.loading', () => false)
  const error = useState<string | null>('auth.error', () => null)

  // --- Login ---
  const login = async (credentials: LoginInput) => {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{ success: boolean; user: User }>('/api/auth/login', {
        method: 'POST',
        body: credentials
      })

      if (response.success) {
        user.value = response.user
        error.value = null
        await navigateTo('/users')
        return response
      }
    } catch (err: any) {
      console.error('Login error:', err)
      const errorMessage = err.data?.data?.auth || err.data?.auth || err.message || 'Login failed'
      error.value = errorMessage
      throw err
    } finally {
      loading.value = false
    }
  }

  // --- Logout ---
  const logout = async () => {
    loading.value = true
    error.value = null

    try {
      await $fetch('/api/auth/logout', {
        method: 'POST'
      })

      user.value = null
      error.value = null
      await navigateTo('/')
    } catch (err: any) {
      console.error('Logout error:', err)
      const errorMessage = err.message || 'Logout failed'
      error.value = errorMessage
      throw err
    } finally {
      loading.value = false
    }
  }

  // --- Fetch current user ---
  const fetchUser = async () => {
    try {
      const response = await $fetch<{ user: User }>('/api/auth/me')
      user.value = response.user
      return response.user
    } catch (err: any) {
      console.error('Fetch user error:', err)
      user.value = null
      return null
    }
  }

  // --- Check if user is authenticated ---
  const isAuthenticated = computed(() => !!user.value)

  // --- Check if user has specific role ---
  const hasRole = (role: string) => {
    return user.value?.roles === role
  }

  return {
    user: readonly(user),
    loading: readonly(loading),
    error: readonly(error),
    login,
    logout,
    fetchUser,
    isAuthenticated,
    hasRole
  }
}