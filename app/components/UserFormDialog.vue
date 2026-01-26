<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import type { User, UserForm } from '../../shared/types/user';
import { Input } from './ui/input';
import { Eye, EyeOff } from 'lucide-vue-next'; 


interface Props {
  open: boolean
  user?: User | undefined
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  'submit': [data: Omit<User, 'id' | 'status'>]
}>()

const { updateUser, createUser } = useUsers()

const form = ref <UserForm> ({
  name: '',
  username: '',
  email: '',
  roles: undefined,
  password: '',
  isActive: false
})

const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

watch(() => props.user, (newUser) => {
  showPassword.value = false
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
    form.value = { name: '', username: '', email: '', roles: undefined, password: '', isActive: false }
  }
})

watch(() => props.open, (val) => {
  if (!val) showPassword.value = false
})

const isEditing = computed(() => !!props.user?.id)

const handleSubmit = async () => {
  console.log('Submit triggered!', form.value)
  loading.value = true
  error.value = ''

  try {
    if (isEditing.value && props.user) {
      console.log('Updating user...')
      await updateUser(props.user.id, form.value)
    } else {
      console.log('Creating user...')
      await createUser(form.value as any)
    }
    console.log('Success!')
    emit('update:open', false)
    emit('submit', form.value as any)
  } catch (err : any) {
    console.error('Submit Error:', err)
    error.value = err.message || 'Failed to save user'
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="handleClose">
    <DialogContent class="bg-white max-w-md">
      <DialogHeader>
        <DialogTitle>{{ isEditing ? 'Edit User' : 'Create User' }}</DialogTitle>
        <DialogClose />
      </DialogHeader>

      <div class="space-y-4">
        <div class="flex justify-center mb-4">
          <div class="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
            <span class="text-4xl font-bold text-gray-500">SF</span>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-3">
          <div v-if="error" class="text-red-600 text-sm bg-red-50 p-2 rounded">{{ error }}</div>
          <div>
            <label class="block text-sm font-medium mb-1">Roles</label>
              <!-- <select v-model="form.roles" class="w-full px-3 py-2 border rounded-md text-sm" required>
                <option value="" disabled>Select a role</option>
                <option value="OBSERVER">Observer</option>
                <option value="STAFF">Staff</option>
              </select> -->
            <Select v-model="form.roles">
              <SelectTrigger class="w-full rounded-md border-gray-300 focus:ring-gray-400">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OBSERVER">Observer</SelectItem>
                <SelectItem value="STAFF">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="block text-sm font-medium mb-1">
            <label>Name</label>
            <Input
            v-model="form.name"
            type="text"
            placeholder="Full Name"
            required
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Username</label>
            <Input 
            v-model="form.username"
            type="text"
            placeholder="Username"
            required
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Email</label>
            <Input
            v-model="form.email"
            type="email"
            placeholder="Email Address"
            required
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Password</label>
            <div class="relative">
              <Input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="********"
                :required="!isEditing"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                @click="showPassword = !showPassword"
              >
                <Eye v-if="showPassword" class="h-4 w-4" />
                <EyeOff v-else class="h-4 w-4" />
              </button>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <Button variant="secondary" size="lg" type="submit" :disabled="loading">
              {{ loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Save changes' : 'Register') }}
            </Button>
          </div>
        </form>     
      </div>
    </DialogContent>
  </Dialog>
</template>
