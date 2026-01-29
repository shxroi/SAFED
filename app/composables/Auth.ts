import type { LoginInput } from '../../shared/schemas/userSchema'
import type { User } from '../../shared/types/user'

export const useAuth = () => {
  const { user: sessionUser, clear: clearSession, fetch: fetchSession } = useUserSession()
  
  // Maps the session user to our local state
  const user = computed<User | null>(() => sessionUser.value as any)
  const loading = useState('auth.loading', () => false)
  const error = useState<string | null>('auth.error', () => null)

  // --- Login ---
  const login = async (credentials: any) => {
    loading.value = true
    try {
      const res = await $fetch('/api/auth/login', {
        method: 'POST',
        body: credentials
      })
      // This refreshes the session from the cookie set by the server
      await fetchSession()
      return res 
    } catch (err: any) {
      throw err
    } finally {
      loading.value = false
    }
  }

  // --- Logout ---
  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clearSession()
    navigateTo('/')
  }


  return {
    user: readonly(user),
    loading: readonly(loading),
    error: readonly(error),
    login,
    logout,
    loggedIn: computed(() => !!sessionUser.value)  
  }
}