<script lang="ts" setup>
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow, } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import UserFormDialog from "~/components/UserFormDialog.vue";
import type { User } from "../../../shared/types/user"

const { data, pending, error, refresh } = await useFetch<{ users: User[] }>('/api/users')
const users = computed(() => data.value?.users || [])

const { deleteUser } = useUsers()

const dialogOpen = ref(false)
const selectedUser = ref<User | undefined>(undefined)
const filterRole = ref('All')

const roles = [ 'All', 'OBSERVER', 'STAFF']
const searchQuery = ref('')

const filteredUsers = computed(() => {
  if (filterRole.value === 'All') {
    return users.value
  }
  return users.value.filter(user => user.roles === filterRole.value)
})

const handleCreateNew = () => {
  selectedUser.value = undefined
  dialogOpen.value = true
}
const handleEditUser = (user: User) => {
  selectedUser.value = user
  dialogOpen.value = true
} 

const handleDelete = async (id: number) => {
  if (confirm('Are you want to delete this user?')) {
    try {
      await deleteUser(id)
      await refresh()
    } catch (err) {
      console.error('Failed to delete user', err)
    }
  }
}

const handleDialogSubmit = async () => {
  await refresh()
}
</script>

<template>
  <div class="container mx-auto mt-10 p-6">
     <!-- Header Section -->
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-2xl font-bold text-gray-700">Manage User</h1>

      <div class="flex items-center gap-3">
        <!-- Search Input -->
        <div class="relative w-58">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            v-model="searchQuery"
            placeholder="Search" 
            class="pl-10 rounded-full border-gray-300 focus-visible:ring-gray-400"
          />
        </div>

        <!-- Short by (Role Filter) -->
        <Select v-model="filterRole">
          <SelectTrigger class="w-40 rounded-full border-gray-300 focus:ring-gray-400">
            <div class="flex items-center gap-2 text-gray-600">
              <SelectValue placeholder="Short by" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="role in roles" :key="role" :value="role">
              {{ role }}
            </SelectItem>
          </SelectContent>
        </Select>

        <!-- Register Button -->
        <Button 
          @click="handleCreateNew" 
          class="rounded-lg px-6 hover:bg-gray-500 text-white font-medium"
        >
          Register New+
        </Button>
      </div>
    </div>
    <div v-if="pending">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else>
      <Table class="shadow-md rounded-md">
      <TableCaption>List of Users</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role Access</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
      <TableBody>
        <TableRow v-for="user in filteredUsers" :key="user.id">
          <TableCell>{{ user.id }}</TableCell>
          <TableCell>{{ user.name }}</TableCell>
          <TableCell>{{ user.username }}</TableCell>
          <TableCell>{{ user.email }}</TableCell>
          <TableCell>{{ user.roles }}</TableCell>
          <TableCell>{{ user.isActive ? 'Active' : 'Inactive' }}</TableCell>
          <TableCell class="space-x-2">
            <Button variant="secondary" size="icon" @click="handleEditUser(user)">✏️</Button>
            <Button variant="destructive" size="icon" @click="handleDelete(user.id)">🗑️</Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>  
    </div>
    
  </div>

  <UserFormDialog
    :open="dialogOpen"
    :user="selectedUser || undefined"
    @update:open="dialogOpen = $event"
    @submit="handleDialogSubmit"
  />
</template>

<style>

</style>