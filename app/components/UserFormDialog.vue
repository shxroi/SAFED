<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import type { User, UserForm } from '../../shared/types/user';
import { Input } from './ui/input';
import { Eye, EyeOff } from 'lucide-vue-next';
import { userCreateSchema, userUpdateSchema } from '../../shared/schemas/userSchema';
import { toast } from 'vue-sonner'

interface Props {
  open: boolean
  user?: User | undefined
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  'submit': [data: Omit<User, 'id'>]
}>()

const { updateUser, createUser } = useUsers()

const form = ref<UserForm>({
  name: '',
  username: '',
  email: '',
  roles: undefined,
  password: '',
  isActive: false
})

const loading = ref(false)
const fieldErrors = ref<Record<string, string>>({})
const generalError = ref('')
const showPassword = ref(false)
const touched = ref<Record<string, boolean>>({})
const isEditing = computed(() => !!props.user?.id)

// --- Validate entire form ---
const validateForm = (): boolean => {
  fieldErrors.value = {}
  const schema = isEditing.value ? userUpdateSchema : userCreateSchema

  const result = schema.safeParse(form.value)

  if (!result.success) {
    result.error.issues.forEach((issue: any) => {
      const path = issue.path.join('.')
      fieldErrors.value[path] = issue.message
    })
    return false
  }

  return true
}

// --- Validate individual field on blur (only show errors if touched) ---
const validateField = (fieldName: keyof UserForm): void => {
  touched.value[fieldName] = true
  
  const schema = isEditing.value ? userUpdateSchema : userCreateSchema
  
  // Build a test object with all current form values for context
  const testData = { ...form.value }

  const result = schema.safeParse(testData)

  if (!result.success) {
    const fieldError = result.error?.issues.find((issue: any) => issue.path[0] === fieldName)
    if (fieldError) {
      fieldErrors.value[fieldName] = fieldError.message
    } else {
      delete fieldErrors.value[fieldName]
    }
  } else {
    delete fieldErrors.value[fieldName]
  }
}

// --- Check if field has error and has been touched ---
const hasFieldError = (fieldName: keyof UserForm): boolean => {
  return (touched.value[fieldName] ?? false) && !!fieldErrors.value[fieldName]
}

// --- Get field error message ---
const getFieldError = (fieldName: keyof UserForm): string => {
  return touched.value[fieldName] ? (fieldErrors.value[fieldName] || '') : ''
}

// --- Check if form is valid ---
const isFormValid = computed(() => {
  // Only check validity if form has been submitted or fields are touched
  const schema = isEditing.value ? userUpdateSchema : userCreateSchema
  const result = schema.safeParse(form.value)
  return result.success
})

// --- Reset form when user changes ---
watch(() => props.user, (newUser) => {
  showPassword.value = false
  fieldErrors.value = {}
  touched.value = {}
  generalError.value = ''
  
  if (newUser) {
    form.value = { 
      name: newUser.name,
      username: newUser.username, 
      email: newUser.email,
      roles: newUser.roles,
      password: '',
      isActive: newUser.isActive
    }
  } else { 
    form.value = { 
      name: '', 
      username: '', 
      email: '', 
      roles: undefined, 
      password: '', 
      isActive: false 
    }
  }
}, { immediate: true })

watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    showPassword.value = false
    fieldErrors.value = {}
    touched.value = {}
    generalError.value = ''
  }
})

// --- Handle form submission ---
const handleSubmit = async (): Promise<void> => {
  // Mark all fields as touched
  Object.keys(form.value).forEach(field => {
    touched.value[field as keyof UserForm] = true
  })

  // Validate entire form
  if (!validateForm()) {
    generalError.value = 'Please fix the validation errors above'
    return
  }

  loading.value = true
  generalError.value = ''

  try {
    const submitData = {
      ...form.value,
      roles: form.value.roles as string
    }

    if (isEditing.value && props.user) {
      await updateUser(props.user.id, submitData as any)
    } else {
      await createUser(submitData as any)
    }
    
    emit('update:open', false)
    emit('submit', submitData as any)
    toast.success(`User ${isEditing.value ? 'updated' : 'created'} successfully`,
      {
        style: {
          backgroundColor: '#ECFDF5', // green-50
          color: '#166534',           // green-700
          border: '1px solid #A7F3D0' // green-200
        }
      }
    )
  } catch (err: any) {
    console.error('Form submission error:', err)
    
    // Handle backend validation errors
    if (err.data && typeof err.data === 'object') {
      fieldErrors.value = { ...fieldErrors.value, ...err.data }
      generalError.value = err.message || 'Please fix the validation errors'
    } else {
      generalError.value = err.message || 'Failed to save user'
    }
  } finally {
    loading.value = false
  }
}

const handleClose = (): void => {
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="handleClose">
    <DialogContent class="bg-white max-w-md">
      <DialogHeader>
        <DialogTitle>{{ isEditing ? 'Edit User' : 'Create New User' }}</DialogTitle>
        <DialogClose />
      </DialogHeader>

      <div class="space-y-4">
        <!-- Avatar placeholder -->
        <div class="flex justify-center mb-4">
          <div class="w-24 h-24 bg-gradient-to-br from-blue-200 to-blue-400 rounded-full flex items-center justify-center">
            <span class="text-4xl font-bold text-white">{{ form.name.charAt(0).toUpperCase() || 'U' }}</span>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-3">
          <!-- General error message -->
          <div v-if="generalError" class="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded">
            {{ generalError }}
          </div>

          <!-- Roles Select -->
          <div>
            <label for="roles" class="block text-sm font-medium mb-1">
              Role <span class="text-red-500">*</span>
            </label>
            <select 
              id="roles"
              v-model="form.roles"
              @blur="validateField('roles')"
              @change="validateField('roles')"
              :class="[
                'w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors',
                hasFieldError('roles') ? 'border-red-500 focus:ring-red-500' : ''
              ]"
            >
              <option value="">Select a role</option>
              <option value="IM">Implementation Manager</option>
              <option value="OBSERVER">Observer</option>
              <option value="STAFF">Staff</option>
            </select>
            <p v-if="getFieldError('roles')" class="text-red-500 text-xs mt-1">
              {{ getFieldError('roles') }}
            </p>
          </div>

          <!-- Name Input -->
          <div>
            <label for="name" class="block text-sm font-medium mb-1">
              Full Name <span class="text-red-500">*</span>
            </label>
            <Input
              id="name"
              v-model="form.name"
              type="text"
              placeholder="John Doe"
              :class="{ 'border-red-500 focus:ring-red-500': hasFieldError('name') }"
              @blur="validateField('name')"
              @input="validateField('name')"
            />
            <p v-if="getFieldError('name')" class="text-red-500 text-xs mt-1">
              {{ getFieldError('name') }}
            </p>
          </div>

          <!-- Username Input -->
          <div>
            <label for="username" class="block text-sm font-medium mb-1">
              Username <span class="text-red-500">*</span>
            </label>
            <Input 
              id="username"
              v-model="form.username"
              type="text"
              placeholder="john_doe"
              :class="{ 'border-red-500 focus:ring-red-500': hasFieldError('username') }"
              @blur="validateField('username')"
              @input="validateField('username')"
            />
            <p v-if="getFieldError('username')" class="text-red-500 text-xs mt-1">
              {{ getFieldError('username') }}
            </p>
          </div>

          <!-- Email Input -->
          <div>
            <label for="email" class="block text-sm font-medium mb-1">
              Email Address <span class="text-red-500">*</span>
            </label>
            <Input
              id="email"
              v-model="form.email"
              type="email"
              placeholder="john@example.com"
              :class="{ 'border-red-500 focus:ring-red-500': hasFieldError('email') }"
              @blur="validateField('email')"
              @input="validateField('email')"
            />
            <p v-if="getFieldError('email')" class="text-red-500 text-xs mt-1">
              {{ getFieldError('email') }}
            </p>
          </div>

          <!-- Password Input -->
          <div v-if="!isEditing || form.password">
            <label for="password" class="block text-sm font-medium mb-1">
              Password 
              <span v-if="!isEditing" class="text-red-500">*</span>
              <span v-else class="text-gray-500 text-xs">(leave blank to keep current)</span>
            </label>
            <div class="relative">
              <Input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                :class="{ 'border-red-500 focus:ring-red-500': hasFieldError('password') }"
                @blur="validateField('password')"
                @input="validateField('password')"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                @click="showPassword = !showPassword"
                aria-label="Toggle password visibility"
              >
                <Eye v-if="showPassword" class="h-4 w-4" />
                <EyeOff v-else class="h-4 w-4" />
              </button>
            </div>
            <p v-if="getFieldError('password')" class="text-red-500 text-xs mt-1">
              {{ getFieldError('password') }}
            </p>
            
            <!-- Password strength indicator -->
            <div v-if="form.password && !isEditing" class="mt-3 p-2 bg-gray-50 rounded border border-gray-200">
              <div class="text-xs font-semibold text-gray-700 mb-2">Password requirements:</div>
              <div class="space-y-1">
                <div :class="['text-xs flex items-center gap-2', /[a-z]/.test(form.password) ? 'text-green-600' : 'text-gray-400']">
                  <span>{{ /[a-z]/.test(form.password) ? '✓' : '○' }}</span>
                  <span>Lowercase letter</span>
                </div>
                <div :class="['text-xs flex items-center gap-2', /[A-Z]/.test(form.password) ? 'text-green-600' : 'text-gray-400']">
                  <span>{{ /[A-Z]/.test(form.password) ? '✓' : '○' }}</span>
                  <span>Uppercase letter</span>
                </div>
                <div :class="['text-xs flex items-center gap-2', /[0-9]/.test(form.password) ? 'text-green-600' : 'text-gray-400']">
                  <span>{{ /[0-9]/.test(form.password) ? '✓' : '○' }}</span>
                  <span>Number</span>
                </div>
                <div :class="['text-xs flex items-center gap-2', form.password.length >= 8 ? 'text-green-600' : 'text-gray-400']">
                  <span>{{ form.password.length >= 8 ? '✓' : '○' }}</span>
                  <span>At least 8 characters</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="flex gap-2 pt-4">
            <Button 
              variant="outline"
              size="lg"
              type="button"
              @click="handleClose"
              class="flex-1"
            >
              Cancel
            </Button>
            <Button 
              variant="default"
              size="lg"
              type="submit" 
              :disabled="loading || !isFormValid"
              class="flex-1"
            >
              <span v-if="loading">
                {{ isEditing ? 'Updating...' : 'Creating...' }}
              </span>
              <span v-else>
                {{ isEditing ? 'Save Changes' : 'Create Account' }}
              </span>
            </Button>
          </div>
        </form>     
      </div>
    </DialogContent>
  </Dialog>
</template>