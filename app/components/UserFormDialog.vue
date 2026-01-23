<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import type { User, UserForm } from '../../shared/types/user';
import { Input } from './ui/input';

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

watch(() => props.user, (newUser) => {
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
              <select v-model="form.roles" class="w-full px-3 py-2 border rounded-md text-sm" required>
                <option value="" disabled>Select a role</option>
                <option value="OBSERVER">Observer</option>
                <option value="STAFF">Staff</option>
              </select>
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
            <Input
            v-model="form.password"
            type="password"
            placeholder="********"
            :required="!isEditing"
            />
          </div>

          <div class="flex gap-2 pt-4">
            <Button type="submit" :disabled="loading">
              {{ isEditing ? 'Update' : 'Create' }}
              {{ loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update User' : 'Create User') }}
            </Button>
            <!-- <button 
              type="submit" 
              :disabled="loading" 
              class="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
            >
              {{ loading ? 'Saving...' : (isEditing ? 'Update User' : 'Create User') }}
            </button> -->
          </div>
        </form>     
      </div>
    </DialogContent>
  </Dialog>
</template>
