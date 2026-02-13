<script lang="ts" setup>
import { ref, computed } from 'vue'
import { Search, Plus, Calendar, MapPin, Users, MoreVertical, Eye, Pencil, Trash2, Filter, Building2, UserCheck } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import type { Operation } from '../../../shared/types/operation'

const { user } = useAuth()
const userRole = computed(() => user.value?.roles)

const isIM = computed(() => userRole.value === 'IM')

const router = useRouter()
const searchQuery = ref('')
const showMyOperationsOnly = ref(false)

// Fetch operations with search
const { data: operationsData, pending, error, refresh } = await useFetch('/api/operations', {
  query: computed(() => ({
    search: searchQuery.value || undefined,
  })),
  watch: [searchQuery],
})

// Filter operations based on "My Operations" toggle
const operations = computed(() => {
  let ops = operationsData.value?.operations || []
  
  if (showMyOperationsOnly.value) {
    ops = ops.filter(op => op.isEnrolled)
  }
  
  return ops
})

// FIX: Compute status counts once instead of filtering repeatedly in template
const statusCounts = computed(() => {
  const ops = operationsData.value?.operations || []
  return {
    total: ops.length,
    active: ops.filter(op => op.status === 'Active').length,
    draft: ops.filter(op => op.status === 'Draft').length,
    complete: ops.filter(op => op.status === 'Complete').length,
  }
})

// Get display title (VesselName - Company or just Company)
const getOperationTitle = (operation: Operation) => {
  if (operation.vesselName) {
    return `${operation.vesselName} - ${operation.company}`
  }
  return operation.company
}

// FIX: Added validation for invalid dates
const getDaysLeft = (dateString: string | null | undefined): number | null => {
  if (!dateString) return null
  
  const opDate = new Date(dateString)
  if (isNaN(opDate.getTime())) return null
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  opDate.setHours(0, 0, 0, 0)
  
  const diffDays = Math.ceil((opDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays
}

// Check if operation date is approaching (H-3)
const isDateApproaching = (dateString: string | null | undefined): boolean => {
  const daysLeft = getDaysLeft(dateString)
  if (daysLeft === null) return false
  return daysLeft <= 3 && daysLeft >= 0
}

// Status badge styling
const getStatusColor = (status: Operation['status']) => {
  switch (status) {
    case 'Draft': return 'bg-secondary text-primary'
    case 'Active': return 'bg-blue-100 text-blue-950'
    case 'Complete': return 'bg-green-100 text-green-800'
    case 'Cancelled': return 'bg-red-100 text-red-600'
    default: return 'bg-gray-100 text-gray-800'
  }
}

// Type badge styling
const getTypeColor = (type: Operation['type']) => {
  switch (type) {
    case 'Installation': return 'bg-blue-200 text-blue-900'
    case 'Maintenance': return 'bg-amber-100 text-amber-900'
    case 'SAT/Commissioning': return 'bg-cyan-100 text-cyan-800'
    case 'Upgrade': return 'bg-pink-100 text-pink-800'
    case 'Uninstall': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

// FIX: Added validation for invalid dates
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Invalid date'
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid date'
  
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// FIX: Extracted shared mutation helper to reduce duplication
const mutateOperation = async (
  id: number, 
  options: { method: 'PATCH' | 'DELETE'; body?: Record<string, unknown> },
  actionName: string
) => {
  try {
    await $fetch(`/api/operations/${id}`, {
      method: options.method,
      body: options.body,
    })
    await refresh()
  } catch (error: any) {
    console.error(`Error ${actionName} operation:`, error)
    alert(error.data?.message || `Failed to ${actionName} operation`)
    throw error
  }
}

// Actions
const handleView = (operation: Operation) => {
  router.push(`/operations/${operation.id}/execute`)
}

const handleEdit = (operation: Operation) => {
  router.push(`/operations/create?id=${operation.id}`)
}

const handleDelete = async (operation: Operation) => {
  if (!confirm(`Are you sure you want to delete operation "${getOperationTitle(operation)}"?`)) {
    return
  }
  
  await mutateOperation(operation.id, { method: 'DELETE' }, 'deleting')
}

const handleCancel = async (operation: Operation) => {
  if (!confirm(`Are you sure you want to cancel operation "${getOperationTitle(operation)}"?`)) {
    return
  }
  
  await mutateOperation(
    operation.id, 
    { method: 'PATCH', body: { status: 'Cancelled' } }, 
    'cancelling'
  )
}

const handleNewOperation = () => {
  router.push('/operations/create')
}
</script>

<template>
  <div class="p-4 md:p-8">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Operation List</h1>
      <div class="flex items-center gap-3">
        <!-- Search Input -->
        <div class="relative w-64">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            v-model="searchQuery"
            placeholder="Search operations..." 
            class="pl-10 rounded-md border-gray-300 focus-visible:ring-gray-400"
          />
        </div>

        <!-- Filter Button -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" class="gap-2">
              <Filter class="h-4 w-4" />
              Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter Operations</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem 
              v-model:checked="showMyOperationsOnly"
            >
              My Operations Only
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <!-- New Operation Button - Only for IM -->
        <Button v-if="isIM" @click="handleNewOperation" class="gap-2">
          <Plus class="h-4 w-4" />
          New Operation
        </Button>
      </div>
    </div>

    <!-- Stats Cards - FIX: Using computed statusCounts instead of repeated filters -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ statusCounts.total }}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Active</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ statusCounts.active }}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Draft</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ statusCounts.draft }}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Complete</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ statusCounts.complete }}</div>
        </CardContent>
      </Card>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="text-center py-12">
      <p class="text-gray-500">Loading operations...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12">
      <p class="text-red-500">Failed to load operations</p>
    </div>

    <!-- Operations Grid - FIX: Using operations directly -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card 
        v-for="operation in operations" 
        :key="operation.id" 
        class="hover:shadow-lg transition-shadow cursor-pointer relative group"
        @click="handleView(operation)"
      >
        <CardHeader class="pb-4">
          <!-- Title and Menu -->
          <div class="flex justify-between items-start mb-3">
            <CardTitle class="text-lg font-semibold pr-2 line-clamp-1">
              {{ getOperationTitle(operation) }}
            </CardTitle>
            
            <!-- Context Menu (Only for IM) -->
            <DropdownMenu v-if="isIM">
              <DropdownMenuTrigger as-child @click.stop>
                <Button variant="ghost" size="icon" class="h-8 w-8 flex-shrink-0 -mr-2">
                  <MoreVertical class="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem @click="handleView(operation)" class="cursor-pointer">
                  <Eye class="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem 
                  v-if="operation.status === 'Draft'" 
                  @click="handleEdit(operation)" 
                  class="cursor-pointer"
                >
                  <Pencil class="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  v-if="operation.status !== 'Complete' && operation.status !== 'Cancelled'" 
                  @click="handleCancel(operation)" 
                  class="text-orange-600 cursor-pointer"
                >
                  <Trash2 class="h-4 w-4 mr-2" />
                  Cancel Operation
                </DropdownMenuItem>
                <DropdownMenuItem 
                  v-if="operation.status === 'Draft'" 
                  @click="handleDelete(operation)" 
                  class="text-red-600 cursor-pointer"
                >
                  <Trash2 class="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <!-- Badges -->
          <div class="flex gap-2 flex-wrap">
            <Badge :class="getTypeColor(operation.type)" class="text-xs font-medium px-3 py-1">
              {{ operation.type }}
            </Badge>
            <Badge :class="getStatusColor(operation.status)" class="text-xs font-medium px-3 py-1">
              {{ operation.status }}
            </Badge>
            <!-- Enrolled Badge -->
            <Badge 
              v-if="operation.isEnrolled" 
              class="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-xs font-medium px-2 py-1 flex items-center gap-1"
            >
              <UserCheck class="h-3 w-3" />
              Assigned
            </Badge>
          </div>
        </CardHeader>

        <CardContent class="space-y-3 pt-0">
          <!-- Location -->
          <div class="flex items-center gap-2 text-sm text-gray-700">
            <MapPin class="h-4 w-4 flex-shrink-0 text-gray-500" />
            <span>{{ operation.location }}</span>
          </div>

          <!-- Date with Reminder Badge - FIX: Only show badge if date is valid -->
          <div class="flex items-center justify-between gap-2 text-sm">
            <div class="flex items-center gap-2 text-gray-700">
              <Calendar class="h-4 w-4 flex-shrink-0 text-gray-500" />
              <span>{{ formatDate(operation.date) }}</span>
            </div>
            <Badge 
              v-if="isDateApproaching(operation.date) && operation.status === 'Draft' && getDaysLeft(operation.date) !== null"
              class="bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 whitespace-nowrap"
            >
              {{ getDaysLeft(operation.date) }} days left
            </Badge>
          </div>

          <!-- Company (if no vessel name) -->
          <div v-if="!operation.vesselName" class="flex items-center gap-2 text-sm text-gray-700">
            <Building2 class="h-4 w-4 flex-shrink-0 text-gray-500" />
            <span>{{ operation.company }}</span>
          </div>

          <!-- Assigned Staff -->
          <div class="flex items-center gap-2 text-sm text-gray-700">
            <Users class="h-4 w-4 flex-shrink-0 text-gray-500" />
            <span>{{ operation.assignedStaff }} Staff assigned</span>
          </div>

          <!-- Progress Section -->
          <div class="space-y-2 pt-2">
            <div class="flex justify-between items-center">
              <span class="text-sm font-semibold text-gray-900">Progress</span>
              <span class="text-sm font-bold text-gray-900">{{ operation.progress }}%</span>
            </div>
            <Progress :model-value="operation.progress" class="h-2" />
          </div>

          <!-- Supervisor -->
          <div class="pt-3 border-t text-sm">
            <span class="text-gray-600">Supervisor: </span>
            <span class="font-medium text-gray-900">{{ operation.supervisorName || 'Not assigned' }}</span>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Empty State -->
    <div v-if="!pending && !error && operations.length === 0" class="text-center py-12">
      <p class="text-gray-500">No operations found</p>
      <Button 
        v-if="showMyOperationsOnly" 
        variant="link" 
        @click="showMyOperationsOnly = false"
      >
        Show all operations
      </Button>
    </div>
  </div>
</template>