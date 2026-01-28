<script lang="ts" setup>
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow, } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Pencil, Trash, MoreVertical, Filter } from 'lucide-vue-next'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Search } from 'lucide-vue-next'
import UserFormDialog from "~/components/UserFormDialog.vue";
import DeleteConfirmDialog from "~/components/DeleteConfimDialog.vue";
import type { User } from "../../../shared/types/user"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from '@/components/ui/pagination'
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"

const route = useRoute()
const router = useRouter()
const { updateStatus, deleteUser } = useUsers()

// --- Constants ---
const itemsPerPage = 10
const roles = ['OBSERVER', 'STAFF']

// --- Helper functions to parse URL query ---
const parseRolesFromQuery = (queryRoles: unknown): string[] => {
  if (!queryRoles) return []
  if (typeof queryRoles === 'string') return queryRoles.split(',').filter(r => r.length > 0)
  return []
}

const parseStatusesFromQuery = (queryStatus: unknown): boolean[] => {
  if (!queryStatus) return []
  if (typeof queryStatus === 'string') {
    return queryStatus.split(',')
      .filter(s => s === 'true' || s === 'false')
      .map(s => s === 'true')
  }
  return []
}

// --- Reactive State derived from URL ---
const searchQuery = ref((route.query.search as string) || '')
const currentPage = ref(Number(route.query.page) || 1)
const activeRoles = ref<string[]>(parseRolesFromQuery(route.query.roles))
const activeStatuses = ref<boolean[]>(parseStatusesFromQuery(route.query.status))

// Temporary selection (inside Popover only)
const selectedRoles = ref<string[]>([...activeRoles.value])
const selectedStatuses = ref<boolean[]>([...activeStatuses.value])
const filterPopoverOpen = ref(false)

// --- Sync local state FROM URL when URL changes externally ---
watch(() => route.query, (newQuery) => {
  const newSearch = (newQuery.search as string) || ''
  if (searchQuery.value !== newSearch) {
    searchQuery.value = newSearch
  }

  const newPage = Number(newQuery.page) || 1
  if (currentPage.value !== newPage) {
    currentPage.value = newPage
  }

  const newRoles = parseRolesFromQuery(newQuery.roles)
  if (JSON.stringify(activeRoles.value) !== JSON.stringify(newRoles)) {
    activeRoles.value = newRoles
    selectedRoles.value = [...newRoles]
  }

  const newStatuses = parseStatusesFromQuery(newQuery.status)
  if (JSON.stringify(activeStatuses.value) !== JSON.stringify(newStatuses)) {
    activeStatuses.value = newStatuses
    selectedStatuses.value = [...newStatuses]
  }
}, { immediate: true })

// --- URL Sync (replace instead of push to avoid cluttering history) ---
const updateURL = () => {
  const newQuery: Record<string, string | undefined> = {
    search: searchQuery.value || undefined,
    page: currentPage.value > 1 ? String(currentPage.value) : undefined,
    roles: activeRoles.value.length > 0 ? activeRoles.value.join(',') : undefined,
    status: activeStatuses.value.length > 0 ? activeStatuses.value.join(',') : undefined,
  }

  const currentQuery = route.query
  const hasChanged = 
    newQuery.search !== (currentQuery.search || undefined) ||
    newQuery.page !== (currentQuery.page || undefined) ||
    newQuery.roles !== (currentQuery.roles || undefined) ||
    newQuery.status !== (currentQuery.status || undefined)

  if (hasChanged) {
    // with every search/filter/pagination change
    router.replace({ query: newQuery })
  }
}

// --- Server-side Fetching (reads directly from URL) ---
const { data, pending, error, refresh } = await useFetch<{ users: User[], total: number }>('/api/users', {
  query: computed(() => ({
    page: route.query.page || 1,
    limit: itemsPerPage,
    search: route.query.search || undefined,
    roles: route.query.roles || undefined,
    status: route.query.status || undefined,
  })),
})

const users = computed(() => data.value?.users || [])
const totalItems = computed(() => data.value?.total || 0)

// --- Filter Toggle Functions ---
const toggleRole = (role: string, checked: boolean) => {
  if (checked) {
    if (!selectedRoles.value.includes(role)) {
      selectedRoles.value = [...selectedRoles.value, role]
    }
  } else {
    selectedRoles.value = selectedRoles.value.filter(r => r !== role)
  }
}

const toggleStatus = (status: boolean, checked: boolean) => {
  if (checked) {
    if (!selectedStatuses.value.includes(status)) {
      selectedStatuses.value = [...selectedStatuses.value, status]
    }
  } else {
    selectedStatuses.value = selectedStatuses.value.filter(s => s !== status)
  }
}

// --- Apply Filter (commits temporary -> active, then updates URL) ---
const handleApplyFilter = () => {
  activeRoles.value = [...selectedRoles.value]
  activeStatuses.value = [...selectedStatuses.value]
  currentPage.value = 1
  filterPopoverOpen.value = false
  updateURL()
}

// --- Clear Filters ---
const handleClearFilters = () => {
  selectedRoles.value = []
  selectedStatuses.value = []
  activeRoles.value = []
  activeStatuses.value = []
  currentPage.value = 1
  filterPopoverOpen.value = false
  updateURL()
}

// --- Debounced Search with proper cleanup ---
let searchTimeout: ReturnType<typeof setTimeout> | null = null

onScopeDispose(() => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
    searchTimeout = null
  }
})

watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    updateURL()
  }, 300)
})

watch(currentPage, (newPage, oldPage) => {
  if (newPage !== oldPage) {
    updateURL()
  }
})

// Reset temporary selections when Popover opens
watch(filterPopoverOpen, (isOpen) => {
  if (isOpen) {
    selectedRoles.value = [...activeRoles.value]
    selectedStatuses.value = [...activeStatuses.value]
  }
})

// --- Data Actions ---
const handleToggleStatus = async (user: User) => {
  await updateStatus(user.id, !user.isActive)
  await refresh()
}

const dialogOpen = ref(false)
const selectedUser = ref<User | undefined>(undefined)
const deleteDialogOpen = ref(false)
const userIdToDelete = ref<number | null>(null)

const handleEditUser = (user: User) => {
  selectedUser.value = user
  dialogOpen.value = true
}

// --- Delete with explicit null check ---
const confirmDelete = async () => {
  // Explicit null/undefined check instead of truthiness
  // This handles IDs like 0 which are falsy but valid
  if (userIdToDelete.value != null) {
    await deleteUser(userIdToDelete.value)
    await refresh()
    deleteDialogOpen.value = false
    userIdToDelete.value = null
  }
}

// Computed to show active filter count
const activeFilterCount = computed(() => {
  return activeRoles.value.length + activeStatuses.value.length
})
</script>

<template>
  <div class="p-4 md:p-8">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div class="hidden md:flex justify-between items-center mb-10">
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Manage user</h1>
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

        <!-- Filter Popover -->
        <Popover :open="filterPopoverOpen" @update:open="filterPopoverOpen = $event">
          <PopoverTrigger as-child>
            <Button variant="outline" class="rounded-md border-gray-300 flex text-gray-600 gap-2 h-10 relative">
              <Filter class="h-4 w-4 text-gray-500"/>
              <span class="font-normal">Filter</span>
              <!-- Show badge if filters are active -->
              <span 
                v-if="activeFilterCount > 0" 
                class="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
              >
                {{ activeFilterCount }}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-64 p-4 shadow-md rounded-lg" align="end" :side-offset="8">
            <div class="space-y-4">
              <div> 
                <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Roles</h4>
                <div class="space-y-2">
                  <div v-for="role in roles" :key="role" class="flex items-center space-x-2">
                    <Checkbox 
                      :id="role"
                      :checked="selectedRoles.includes(role)"
                      @click="toggleRole(role, !selectedRoles.includes(role))"
                    />
                    <label :for="role" class="text-sm font-medium leading-none cursor-pointer">
                      {{ role }}  
                    </label>
                  </div>
                </div>
              </div>

              <Separator class="my-2"/>

              <div>
                <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Status</h4>
                <div class="space-y-2">
                  <div class="flex items-center space-x-2">
                    <Checkbox
                      id="active"
                      :checked="selectedStatuses.includes(true)"
                      @click="toggleStatus(true, !selectedStatuses.includes(true))"
                    />
                    <label for="active" class="text-sm font-medium leading-none cursor-pointer">Active</label>
                  </div>
                  <div class="flex items-center space-x-2">
                    <Checkbox 
                      id="inactive"
                      :checked="selectedStatuses.includes(false)"
                      @click="toggleStatus(false, !selectedStatuses.includes(false))"
                    />
                    <label for="inactive" class="text-sm font-medium leading-none cursor-pointer">Inactive</label>
                  </div>
                </div>
              </div>

              <div class="flex gap-2">
                <Button 
                  v-if="selectedRoles.length > 0 || selectedStatuses.length > 0"
                  @click="handleClearFilters" 
                  variant="outline"
                  class="flex-1"
                >
                  Clear
                </Button>
                <Button 
                  @click="handleApplyFilter" 
                  class="flex-1 bg-secondary text-primary hover:text-white medium rounded-md"
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <!-- Register Button -->
        <Button 
          @click="() => { selectedUser = undefined; dialogOpen = true }" 
          class="rounded-md px-6 hover:bg-gray-500 text-white font-medium"
        >
          + new
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
          <TableRow v-for="(user, index) in users" :key="user.id">
            <TableCell>{{ (currentPage - 1) * itemsPerPage + index + 1 }}</TableCell>
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
                    <div :class="['w-8 h-4 rounded-full relative transition-colors', user.isActive ? 'bg-gray-900' : 'bg-gray-200']">
                      <div :class="['absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all', user.isActive ? 'left-4' : 'left-0.5']"></div>
                    </div>
                  </DropdownMenuItem>  
                  <DropdownMenuSeparator/>
                  <DropdownMenuItem @click="() => { userIdToDelete = user.id; deleteDialogOpen = true }" class="flex justify-between items-center text-red-600 cursor-pointer">
                    <span>Delete</span>
                    <Trash class="h-4 w-4 text-red-600" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>  

      <Pagination
        v-model:page="currentPage"
        :total="totalItems"
        :items-per-page="itemsPerPage"
        :sibling-count="1"
        show-edges
        as-child
      >
        <PaginationContent v-slot="{ items }" class="flex items-center justify-center mt-4 space-x-2">
          <template v-for="(item, index) in items">
            <PaginationItem v-if="item.type === 'page'" :key="index" :value="item.value" as-child>
              <Button class="w-10 h-10 p-0" :variant="item.value === currentPage ? 'default' : 'ghost'">
                {{ item.value }}
              </Button>
            </PaginationItem>
            <PaginationEllipsis v-else :key="item.type" :index="index" />
          </template>
        </PaginationContent>
      </Pagination>
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
    @submit="refresh()"
  />
</template>