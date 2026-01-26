<script lang="ts" setup>
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow, } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Power, Trash, MoreVertical } from 'lucide-vue-next'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Search } from 'lucide-vue-next'
import UserFormDialog from "~/components/UserFormDialog.vue";
import DeleteConfirmDialog from "~/components/DeleteConfimDialog.vue";
import type { User } from "../../../shared/types/user"

const { data, pending, error, refresh } = await useFetch<{ users: User[] }>('/api/users')
const users = computed(() => data.value?.users || [])

const { updateStatus, deleteUser } = useUsers()

const dialogOpen = ref(false)
const selectedUser = ref<User | undefined>(undefined)
const filterRole = ref('All')

const roles = [ 'All', 'OBSERVER', 'STAFF']
const searchQuery = ref('')

const filteredUsers = computed(() => {
  let result = users.value

  // Apply Role Filter
  if (filterRole.value !== 'All') {
    result = result.filter(user => user.roles === filterRole.value)
  }

  // Apply Search Filter
  if (searchQuery.value.trim() !== '') {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(user => 
      user.name.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    )
  }

  return result
})

const handleToggleStatus = async (user : User) => {
  try {
    await updateStatus(user.id, !user.isActive)
    await refresh()
  } catch (err) {
    console.error('Failed to update user status', err)
  }
}

const handleCreateNew = () => {
  selectedUser.value = undefined
  dialogOpen.value = true
}
const handleEditUser = (user: User) => {
  selectedUser.value = user
  dialogOpen.value = true
} 

const deleteDialogOpen = ref(false)
const userIdToDelete = ref<number | null>(null)

const handleDelete = (id: number) => {
  userIdToDelete.value = id
  deleteDialogOpen.value = true
}

const confirmDelete = async () => {
  if (userIdToDelete.value !== null) {
    try {
      await deleteUser(userIdToDelete.value)
      await refresh()
    } catch (err) {
      console.error('Failed to delete user', err)
    } finally {
      deleteDialogOpen.value = false
      userIdToDelete.value = null
    }
  }
}

const handleDialogSubmit = async () => {
  await refresh()
}
</script>

<template>
  <div class="p-4 md:p-8">
     <!-- Header Section -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Manage User</h1>
      </div>

      <div class="flex items-center gap-3">
        <!-- Search Input -->
        <div class="relative w-58">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            v-model="searchQuery"
            placeholder="Search" 
            class="pl-10 rounded-md border-gray-300 focus-visible:ring-gray-400"
          />
        </div>

        <!-- Short by (Role Filter) -->
        <Select v-model="filterRole">
          <SelectTrigger class="w-40 rounded-md border-gray-300 focus:ring-gray-400">
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
          class="rounded-md px-6 hover:bg-gray-500 text-white font-medium"
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
            <TableHead>No</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role Access</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
      <TableBody>
        <TableRow v-for="(user, index) in filteredUsers" :key="user.id">
          <TableCell>{{ index + 1}}</TableCell>
          <TableCell>{{ user.name }}</TableCell>
          <TableCell>{{ user.username }}</TableCell>
          <TableCell>{{ user.email }}</TableCell>
          <TableCell>{{ user.roles }}</TableCell>
          <TableCell>
            <span :class="user.isActive ? 'bg-green-200 text-green-950 font-medium rounded-sm px-4 py-1' : 'bg-red-200 text-red-700 font-medium rounded-sm px-3 py-1'">
              {{ user.isActive ? 'Active' : 'Inactive' }}
            </span>
          </TableCell>
          <TableCell>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon">
                  <MoreVertical class="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-48">
                <DropdownMenuLabel class="flex justify-center">Action</DropdownMenuLabel>
                <DropdownMenuSeparator/>

                <DropdownMenuItem @click="handleEditUser(user)" class="flex justify-between items-center cursor-pointer">
                  <span>Edit</span>
                  <Pencil class="h-4 w-4" />
                </DropdownMenuItem>

                <DropdownMenuItem @click.stop="handleToggleStatus(user)" class="flex justify-between items-center cursor-pointer">
                  <span>Status</span>
                  <div :class="['w-8 h-4 rounded-full relative transition-colors', user.isActive  ? 'bg-gray-900' : 'bg-gray-200']">
                    <div :class="['absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all', user.isActive ? 'left-4.5' : 'left-0.5']"></div>
                  </div>
                </DropdownMenuItem>  

                <DropdownMenuSeparator/>
                <DropdownMenuItem @click="handleDelete(user.id)" class="flex justify-between items-center text-red-600 cursor-pointer">
                  <span>Delete</span>
                  <Trash class="h-4 w-4 text-red-600" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>  
    </div>
    
  </div>

  <DeleteConfirmDialog 
      :open="deleteDialogOpen" 
      @update:open="deleteDialogOpen = $event" 
      @confirm="confirmDelete" 
    />

  <UserFormDialog
    :open="dialogOpen"
    :user="selectedUser || undefined"
    @update:open="dialogOpen = $event"
    @submit="handleDialogSubmit"
  />
</template>

<style>

</style>