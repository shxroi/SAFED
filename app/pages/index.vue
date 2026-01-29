<script lang="ts" setup>
import { ref } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast, Toaster } from 'vue-sonner'
import safedLogo from '@/assets/images/safed.png'

definePageMeta({
  layout: false,
})

const { login, loading } = useAuth()

const showPassword = ref(false)
const fieldErrors = ref<Record<string, string>>({})
const credentials = ref({
  username: '',
  password: ''
})

const validateField = (field: 'username' | 'password') => {
  if (field === 'username' && credentials.value.username?.trim()) {
    delete fieldErrors.value.username
  }
  if (field === 'password' && credentials.value.password) {
    delete fieldErrors.value.password
  }
}

// --- Type guard for error object ---
const extractErrorMessage = (err: unknown): string => {
  const fallbackMessage = 'Login failed. Please try again.'

  // Narrowing to check if it's an object containing a data property
  if (
    typeof err !== 'object' || 
    err === null || 
    !('data' in err) || 
    typeof (err as any).data !== 'object'
  ) {
    return fallbackMessage
  }

  const responseBody = (err as any).data
  const authMessage = responseBody?.data?.auth
  const serverMessage = responseBody?.message

  return authMessage || serverMessage || fallbackMessage
}

const handleSubmit = async () => {
  fieldErrors.value = {}

  const trimmedUsername = credentials.value.username?.trim()
  const trimmedPassword = credentials.value.password?.trim()

  if (!trimmedUsername) {
    fieldErrors.value.username = 'Username is required'
  }

  if (!trimmedPassword) {
    fieldErrors.value.password = 'Password is requiered'
  }

  if (fieldErrors.value.username || fieldErrors.value.password) {
    toast.error('Please fill all fields', {
      style: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        border: '1px solid #fecaca'
      }
    }) 
    return
  } 
  
  try {
    await login({
      username: trimmedUsername,
      password: trimmedPassword 
    })
    toast.success('Login successful! Redirecting...', {
      style: {
        backgroundColor: '#f0fdf4', // green-50
        color: '#16a34a',           // green-600
        border: '1px solid #86efac' // green-200
      }
    })
  } catch (err: unknown) {
    console.error('Login failed:', err)
    
    const errorMsg = extractErrorMessage(err)
    
    toast.error(errorMsg, {
      style: {
        backgroundColor: '#fef2f2', // red-50
        color: '#dc2626',           // red-600
        border: '1px solid #fecaca' // red-200
      }
    })
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-white">
    <div class="w-full max-w-sm px-6">
      <!-- Logo Section -->
      <div class="text-center mb-16">
        <img :src="safedLogo" alt="safedlogo" class="h-10 mx-auto mb-6" />
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <!-- Username Field -->
        <div class="space-y-2">
          <Label class="text-sm font-bold text-slate-900 pl-1">Username</Label>
          <Input 
            v-model="credentials.username"
            placeholder="admin" 
            type="text"
            class="w-full rounded-md border-slate-200 px-4 focus-visible:ring-slate-300"
            :class="{ 'border-red-500 focus-visible:ring-red-500': fieldErrors.username }"
            @input="validateField('username')"
            @blur="validateField('username')"
          />
          <p v-if="fieldErrors.username" class="text-red-500 text-xs mt-1 font-medium">
            {{ fieldErrors.username }}
          </p>
        </div>

        <!-- Password Field -->
        <div class="space-y-2">
          <Label class="text-sm font-bold text-slate-900 pl-1">Password</Label>
          <div class="relative">
            <Input 
              v-model="credentials.password"
              :type="showPassword ? 'text' : 'password'" 
              placeholder="••••••••" 
              class="w-full rounded-md border-slate-200 px-4 pr-10 focus-visible:ring-slate-300"
              :class="{ 'border-red-500 focus-visible:ring-red-500': fieldErrors.password }"
              @input="validateField('password')"
              @blur="validateField('password')"
            />
            <button 
              type="button" 
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              @click="showPassword = !showPassword"
              aria-label="Toggle password visibility"
            >
              <Eye v-if="!showPassword" class="h-4 w-4" />
              <EyeOff v-else class="h-4 w-4" />
            </button>
          </div>
          <p v-if="fieldErrors.password" class="text-red-500 text-xs mt-1 font-medium">
            {{ fieldErrors.password }}
          </p>
        </div>

        <!-- Submit Button -->
        <div class="pt-4">
          <Button 
            type="submit"
            :disabled="loading"
            class="w-full bg-blue-950 hover:bg-slate-800 text-white rounded-md font-bold transition-all"
          >
            <span v-if="loading">Signing in...</span>
            <span v-else>Sign in</span>
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>