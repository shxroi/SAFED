<script lang="ts" setup>
import { ref, computed } from 'vue'
import { Plus, Minus, Trash2, ChevronRight, User, Users, X } from 'lucide-vue-next' 
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { CalendarDate } from '@internationalized/date'

const dateToCalendarDate = (date: Date | null): CalendarDate | undefined => {
  if (!date) return undefined
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

const calendarDateToDate = (calendarDate: CalendarDate | undefined): Date | null => {
  if (!calendarDate) return null
  return new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day)
}

const router = useRouter()
const route = useRoute()
const operationId = computed(() => route.query.id as string | undefined)
const isEditing = computed(() => !!operationId.value)
const isOperationSaved = computed(() => isEditing.value)
const checklistView = ref<'tools' | 'operation'>('tools')
const selectedSection = ref<number | null>(0)
const isStaffOpen = ref(false)
const isDateOpen = ref(false)

const formData = ref({
  type: '' as 'Installation' | 'Maintenance' | 'SAT/Commissioning' | 'Upgrade' | 'Uninstall' | '',
  company: '',
  vesselName: '',
  location: '',
  date: null as Date | null,
  supervisorId: null as number | null,
  staffIds: [] as number[],
})

interface Activity {
  id?: number
  description: string
  documentationRequired: boolean
}
interface Module {
  id?: number
  name: string
  activities: Activity[]
}
interface Section {
  id?: number
  name: string
  modules: Module[]
}
const sectionsList = ref<Section[]>([
  {
    name: 'Section',
    modules: [
      {
        name: 'Module',
        activities: [
          {
            description: 'Power supply / Panel Surya dapat memberikan tegangan untuk menyuplai tegangan ke Module EMS [Lihat indikator input di MPPT]',
            documentationRequired: true,
          },
          {
            description: '',
            documentationRequired: false,
          },
        ],
      },
    ],
  },
])
interface Tool {
  id?: number
  name: string
  quantity: number
}
const toolsList = ref<Tool[]>([
  { name: 'Radio HT', quantity: 1 },
  { name: 'Oscilloscope portable', quantity: 1 },
  { name: 'Tachometer', quantity: 1 },
  { name: 'Mata Pagoda', quantity: 1 },
])
const addTool = () => {
  toolsList.value.push({ name: '', quantity: 1 })
}
const removeTool = (index: number) => {
  toolsList.value.splice(index, 1)
}
const incrementQuantity = (index: number) => {
  const tool = toolsList.value[index]
  if (tool) {
    tool.quantity++
  }
}
const decrementQuantity = (index: number) => {
  const tool = toolsList.value[index]
  if (tool && tool.quantity > 1) {
    tool.quantity--
  }
}
const { data: staffData } = await useFetch('/api/users', {
  query: { roles: 'STAFF' },
})
const staffList = computed(() => staffData.value?.users || [])
const supervisors = computed(() => staffList.value)
const availableStaff = computed(() => 
  staffList.value.filter((user: any) => user.id !== formData.value.supervisorId)
)
const { data: operationData } = await useFetch(`/api/operations/${operationId.value}`, {
  immediate: !!operationId.value,
})
const { data: checklistData } = await useFetch(`/api/operations/${operationId.value}/checklist`, {
  immediate: !!operationId.value,
})
if (isEditing.value && operationData.value?.operation) {
  const op = operationData.value.operation
  formData.value = {
    type: op.type,
    company: op.company,
    vesselName: op.vesselName || '',
    location: op.location,
    date: new Date(op.date),
    supervisorId: op.enrollments.find((e: any) => e.operationRole === 'SUPERVISOR')?.userId || null,
    staffIds: op.enrollments.filter((e: any) => e.operationRole === 'STAFF').map((e: any) => e.userId),
  }
}
if (isEditing.value && checklistData.value) {
  if (checklistData.value.tools?.length > 0) {
    toolsList.value = checklistData.value.tools
  }
  if (checklistData.value.sections?.length > 0) {
    sectionsList.value = checklistData.value.sections
  }
}

const toggleStaff = (staffId: number) => {
  console.log('Toggling staff:', staffId, 'Current staffIds:', formData.value.staffIds) // DEBUG
  const index = formData.value.staffIds.indexOf(staffId)
  if (index > -1) {
    formData.value.staffIds.splice(index, 1)
  } else {
    formData.value.staffIds.push(staffId)
  }
  console.log('After toggle:', formData.value.staffIds) // DEBUG
}

const removeStaffById = (staffId: number) => {
  console.log('Removing staff:', staffId) // DEBUG
  const index = formData.value.staffIds.indexOf(staffId)
  if (index > -1) {
    formData.value.staffIds.splice(index, 1)
  }
}

const addSection = () => {
  sectionsList.value.push({ name: '', modules: [] })
}
const removeSection = (index: number) => {
  sectionsList.value.splice(index, 1)
  if (selectedSection.value === index) {
    selectedSection.value = null
  }
}
const selectSection = (index: number) => {
  selectedSection.value = index
}
const addModule = (sectionIndex: number) => {
  const section = sectionsList.value[sectionIndex]
  if (section) {
    section.modules.push({ name: '', activities: [] })
  }
}
const removeModule = (sectionIndex: number, moduleIndex: number) => {
  const section = sectionsList.value[sectionIndex]
  if (section) {
    section.modules.splice(moduleIndex, 1)
  }
}
const addActivity = (sectionIndex: number, moduleIndex: number) => {
  const section = sectionsList.value[sectionIndex]
  if (section) {
    const module = section.modules[moduleIndex]
    if (module) {
      module.activities.push({
        description: '',
        documentationRequired: false,
      })
    }
  }
}
const removeActivity = (sectionIndex: number, moduleIndex: number, activityIndex: number) => {
  const section = sectionsList.value[sectionIndex]
  if (section) {
    const module = section.modules[moduleIndex]
    if (module) {
      module.activities.splice(activityIndex, 1)
    }
  }
}
const isBasicInfoValid = computed(() => {
  return formData.value.type && formData.value.company && formData.value.location && formData.value.date
})
const submitting = ref(false)
const handleSubmit = async (isDraft = false, shouldRedirect = true) => {
  // Prevent duplicate submissions
  if (submitting.value) {
    return
  }

  if (!isBasicInfoValid.value) {
    alert('Please fill in all required fields')
    return
  }
  
  submitting.value = true
  
  try {
    let savedOperationId = operationId.value
    // 1. Save Operation Details
    if (isEditing.value) {
      await $fetch(`/api/operations/${operationId.value}`, {
        method: 'PUT',
        body: {
          company: formData.value.company,
          type: formData.value.type,
          vesselName: formData.value.vesselName || null,
          location: formData.value.location,
          date: formData.value.date?.toISOString(),
          supervisorId: formData.value.supervisorId,
          staffIds: formData.value.staffIds,
        },
      })
    } else {
      const result = await $fetch('/api/operations', {
        method: 'POST',
        body: {
          company: formData.value.company,
          type: formData.value.type,
          vesselName: formData.value.vesselName || null,
          location: formData.value.location,
          date: formData.value.date?.toISOString(),
          supervisorId: formData.value.supervisorId,
          staffIds: formData.value.staffIds,
        },
      })
      savedOperationId = result.operation.id.toString()
      
      // Update URL without reloading to unlock checklist
      router.replace({ query: { ...route.query, id: savedOperationId } })
    }
    // 2. Save Checklist (only if we have an ID)
    if (savedOperationId) {
      await $fetch(`/api/operations/${savedOperationId}/checklist`, {
        method: 'PUT',
        body: {
          tools: toolsList.value.filter(t => t.name.trim()),
          sections: sectionsList.value.filter(s => s.name.trim()),
        },
      })
    }
    if (shouldRedirect) {
        alert(isDraft ? 'Draft saved successfully' : 'Operation saved successfully')
        router.push('/operations')
    } else {
        alert('Saved successfully')
    }
  } catch (error: any) {
    console.error('Error:', error)
    alert(error.data?.message || 'Failed to save operation')
  } finally {
    submitting.value = false
  }
}
const calendarDate = computed({
  get: () => dateToCalendarDate(formData.value.date),
  set: (value) => {
    formData.value.date = calendarDateToDate(value)
  },
})

const formatDate = (date: Date | null) => {
  if (!date) return 'Pick a date'
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
}
</script>
<template>
  <div class="min-h-screen bg-gray-50">
    <div class="mx-auto p-8">
      <!-- Top Form Card -->
      <Card class="mb-8 border border-gray-200 shadow-sm">
        <CardContent class="p-6">
          <!-- Row 1: Type, Location, Supervisor -->
          <div class="grid grid-cols-3 gap-6">
            <!-- Column 1: Type, Company, Vessel Name -->
            <div class="space-y-6">
              <div class="space-y-2">
                <Label class="text-sm font-medium text-gray-900">Type</Label>
                <Select v-model="formData.type">
                  <SelectTrigger class="bg-gray-50 w-full border-gray-200">
                    <SelectValue placeholder="Operation Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Installation">Installation</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="SAT/Commissioning">SAT/Commissioning</SelectItem>
                    <SelectItem value="Upgrade">Upgrade</SelectItem>
                    <SelectItem value="Uninstall">Uninstall</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <Label class="text-sm font-medium text-gray-900">Company</Label>
                <Input 
                  v-model="formData.company" 
                  placeholder="Enter company name" 
                  class="bg-gray-50 border-gray-200" 
                />
              </div>

              <div class="space-y-2">
                <Label class="text-sm font-medium text-gray-900">Vessel name</Label>
                <Input 
                  v-model="formData.vesselName" 
                  placeholder="Enter vessel name" 
                  class="bg-gray-50 border-gray-200" 
                />
              </div>
            </div>

            <!-- Column 2: Location, Date -->
            <div class="space-y-6">
              <div class="space-y-2">
                <Label class="text-sm font-medium text-gray-900">Location</Label>
                <Input 
                  v-model="formData.location" 
                  placeholder="Enter location name" 
                  class="bg-gray-50 border-gray-200" 
                />
              </div>

              <div class="space-y-2">
                <Label class="text-sm font-medium text-gray-900">Date</Label>
                <Popover v-model:open="isDateOpen">
                  <PopoverTrigger as-child>
                    <Button 
                      variant="outline" 
                      class="w-full justify-start text-left font-normal bg-gray-50 border-gray-200 hover:bg-gray-100"
                    >
                      <span :class="formData.date ? 'text-gray-900' : 'text-gray-400'">
                        {{ formatDate(formData.date) }}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent class="w-auto p-0" align="start">
                    <Calendar v-model="calendarDate" />
                    <div class="p-3 border-t border-gray-100">
                      <Button 
                        size="sm" 
                        class="w-full bg-slate-900 text-white hover:bg-slate-800 h-8"
                        @click="isDateOpen = false"
                      >
                        Confirm Date
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <!-- Column 3: Supervisor, Staff -->
            <div class="space-y-6">
              <div class="space-y-2">
                <Label class="text-sm font-medium text-gray-900">Supervisor</Label>
                <Select v-model="formData.supervisorId">
                  <SelectTrigger class="bg-gray-50 w-full border-gray-200">
                    <div class="flex items-center gap-2 w-full">
                      <SelectValue placeholder="Choose a supervisor" />
                    </div>
                    <User class="h-4 w-4 text-gray-400 pointer-events-none" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="staff in supervisors" :key="staff.id" :value="staff.id">
                      {{ staff.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <Label class="text-sm font-medium text-gray-900">Staff</Label>
                <Popover v-model:open="isStaffOpen">
                  <PopoverTrigger as-child>
                    <Button 
                      variant="outline" 
                      class="w-full justify-between text-left font-normal bg-gray-50 border-gray-200 hover:bg-gray-100 h-auto min-h-[42px] px-3 py-2"
                    >
                      <div class="flex flex-wrap gap-1.5 flex-1">
                        <template v-if="formData.staffIds.length > 0">
                          <Badge 
                            v-for="id in formData.staffIds" 
                            :key="id" 
                            variant="secondary"
                            class="pl-2 pr-1 h-6 bg-gray-200 border border-gray-400 text-primary hover:bg-gray-300 flex items-center gap-1.5"
                          >
                            <User class="h-3 w-3 text-gray-600" />
                            <span class="text-xs font-medium">{{ staffList.find((s: any) => s.id === id)?.name }}</span>
                            <button
                              @click.stop="removeStaffById(id)"
                              class="rounded-full"
                            >
                              <X class="h-3 w-3" />
                            </button>
                          </Badge>
                        </template>
                        <span v-else class="text-gray-400 text-sm">Choose staff</span>
                      </div>
                      <Users class="h-4 w-4 text-gray-400 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent class="w-80" align="start">
                    <div class="space-y-1">
                      <div class="px-2 py-1.5">
                        <p class="text-sm font-medium text-gray-900">Select Staff Members</p>
                        <p class="text-xs text-gray-500 mt-0.5">
                          {{ formData.staffIds.length }} selected
                        </p>
                      </div>
                      <div class="max-h-60 overflow-y-auto px-1 space-y-1">
                        <div 
                          v-for="staff in availableStaff" 
                          :key="staff.id" 
                          class="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          <Checkbox 
                            :id="`staff-${staff.id}`"
                            :checked="formData.staffIds.includes(staff.id)"
                            @click="() => toggleStaff(staff.id)"
                          />
                          <Label 
                            :for="`staff-${staff.id}`" 
                            class="text-sm font-normal cursor-pointer flex-1 flex items-center gap-2"
                          >
                            <User class="h-4 w-4 text-gray-400" />
                            {{ staff.name }}
                          </Label>
                        </div>
                        <div v-if="availableStaff.length === 0" class="text-center py-6 text-gray-500">
                          <Users class="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p class="text-sm">No staff available</p>
                        </div>
                      </div>
                    </div>
                    <div class="pt-3 mt-3 border-t border-gray-100 px-2">
                      <Button 
                        size="sm" 
                        class="w-full bg-slate-900 text-white hover:bg-slate-800 h-9"
                        @click="isStaffOpen = false"
                      >
                        Done ({{ formData.staffIds.length }} selected)
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <div class="flex justify-end">
            <Button 
              @click="() => handleSubmit(false, false)" 
              :disabled="!isBasicInfoValid || submitting"
              class="bg-slate-900 hover:bg-slate-800 text-white px-8"
            >
              {{ submitting ? 'Saving...' : 'Save Details' }}
            </Button>
          </div>
        </CardContent>
      </Card>
      <!-- Main Checklist Section -->
      <div 
        class="grid grid-cols-[400px_1fr] gap-6 transition-all duration-200"
        :class="{ 'opacity-50 pointer-events-none blur-sm': !isOperationSaved }"
      >
        <!-- Left Sidebar -->
        <div>
          <Card class="shadow-sm">
            <CardContent class="p-6">
              <!-- Toggle View -->
               
              <div class="grid grid-cols-2 gap-2 mb-6">
                <h2 class="text-2xl font-semibold text-gray-900">Checklist</h2>
                <div class="flex align-items-end rounded-md mb-2 p-2 bg-white">
                  <button
                  @click="checklistView = 'tools'"
                  :class="[
                    'flex-1 py-2 text-sm font-medium transition-colors rounded',
                    checklistView === 'tools' 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-600 hover:text-gray-900'
                  ]"
                >
                  Tools
                </button>
                <button
                  @click="checklistView = 'operation'"
                  :class="[
                    'flex-1 py-2 text-sm font-medium transition-colors rounded',
                    checklistView === 'operation' 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-600 hover:text-gray-900'
                  ]"
                >
                  Operation
                </button>
                </div>
              </div>
              <!-- Tools List (Sidebar) -->
              <div v-if="checklistView === 'tools'" class="space-y-2 mb-6">
                <button
                  class="w-full flex items-center justify-between p-3 rounded-md bg-blue-50 text-gray-900 font-medium"
                >
                  <span class="text-sm">Tools</span>
                  <ChevronRight class="h-4 w-4 text-gray-400" />
                </button>
              </div>
              <!-- Section List (Sidebar) -->
              <div v-if="checklistView === 'operation'" class="space-y-2 mb-6">
                <button
                  v-for="(section, index) in sectionsList"
                  :key="index"
                  @click="selectSection(index)"
                  :class="[
                    'w-full flex items-center justify-between p-3 rounded-md transition-colors text-left',
                    selectedSection === index 
                      ? 'bg-blue-50 text-gray-900 font-medium' 
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  ]"
                >
                  <span class="text-sm">{{ section.name || 'Section' }}</span>
                  <ChevronRight class="h-4 w-4 text-gray-400" />
                </button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  @click="addSection"
                  class="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  <Plus class="h-4 w-4 mr-2" />
                  Add new section
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <!-- Right Content -->
        <div>
          <!-- Tools View -->
          <Card v-if="checklistView === 'tools'" class="border border-gray-200 shadow-sm">
            <CardContent class="p-8">
              <h2 class="text-xl font-semibold mb-6 text-gray-900">Tools</h2>
              
              <div class="space-y-6">
                <div 
                  v-for="(tool, index) in toolsList" 
                  :key="index"
                  class="space-y-4"
                >
                  <div class="flex items-center gap-4">
                    <Input 
                      v-model="tool.name" 
                      placeholder="Tool name"
                      class="flex-1 bg-gray-50 border-gray-200"
                    />
                    <div class="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        class="h-9 w-9"
                        @click="decrementQuantity(index)"
                      >
                        <Minus class="h-4 w-4" />
                      </Button>
                      <span class="text-sm font-medium w-8 text-center">{{ tool.quantity }}</span>
                      <Button 
                        variant="outline" 
                        size="icon"
                        class="h-9 w-9"
                        @click="incrementQuantity(index)"
                      >
                        <Plus class="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        @click="removeTool(index)"
                        class="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 class="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  @click="addTool"
                  class="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  <Plus class="h-4 w-4 mr-2" />
                  Add new tool
                </Button>
              </div>
              <div class="flex justify-end mt-8">
                <Button 
                  @click="() => handleSubmit(false, false)" 
                  :disabled="submitting"
                  class="bg-slate-900 hover:bg-slate-800 text-white px-8"
                >
                  {{ submitting ? 'Saving...' : 'Save Checklist' }}
                </Button>
              </div>
            </CardContent>
          </Card>
          <!-- Operation View -->
          <Card v-if="checklistView === 'operation' && selectedSection !== null" class="border border-gray-200 shadow-sm">
            <CardContent class="p-8">
              <div class="space-y-6">
                <!-- Section Name Input -->
                <div class="space-y-2">
                  <Label class="text-sm font-medium text-gray-900">Section</Label>
                  <Input 
                    v-model="sectionsList[selectedSection]?.name" 
                    placeholder="Section name"
                    class="bg-gray-50 border-gray-200"
                  />
                </div>

                <!-- Activities List -->
                <div class="space-y-6">
                  <div class="flex items-center justify-between">
                    <Label class="text-sm font-medium text-gray-900">Activities</Label>
                  </div>
                  
                  <div class="space-y-8">
                    <!-- Iterate modules -->
                    <div 
                      v-for="(module, moduleIndex) in sectionsList[selectedSection!]?.modules || []" 
                      :key="moduleIndex" 
                      class="space-y-4"
                    >
                      <!-- Module Header (optional, if multiple modules exist) -->
                      <div v-if="(sectionsList[selectedSection!]?.modules.length || 0) > 1" class="flex items-center justify-between">
                        <h4 class="text-sm font-medium text-gray-500">{{ module.name || `Module ${moduleIndex + 1}` }}</h4>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          @click="removeModule(selectedSection!, moduleIndex)"
                          class="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                        >
                          <Trash2 class="h-4 w-4 mr-2" />
                          Delete Module
                        </Button>
                      </div>

                      <!-- Activities Loop -->
                      <div class="space-y-4">
                        <div 
                          v-for="(activity, activityIndex) in module.activities" 
                          :key="activityIndex"
                          class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-4"
                        >
                          <Textarea 
                            v-model="activity.description" 
                            placeholder="Enter activity description"
                            class="min-h-[80px] bg-white border-gray-200 resize-none focus-visible:ring-offset-0 focus-visible:ring-1"
                          />
                          <div class="flex items-center justify-between pt-2">
                            <div class="flex items-center space-x-3">
                              <Switch 
                                :id="`switch-${selectedSection}-${moduleIndex}-${activityIndex}`"
                                v-model:checked="activity.documentationRequired"
                              />
                              <Label 
                                :for="`switch-${selectedSection}-${moduleIndex}-${activityIndex}`" 
                                class="text-sm text-gray-700 cursor-pointer font-normal"
                              >
                                Documentation required
                              </Label>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              @click="removeActivity(selectedSection!, moduleIndex, activityIndex)"
                              class="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2 font-medium"
                            >
                              <Trash2 class="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>

                        <!-- Add Activity Button -->
                        <Button 
                          variant="outline" 
                          @click="addActivity(selectedSection!, moduleIndex)"
                          class="w-full justify-between text-gray-500 bg-white border-gray-200 hover:bg-gray-50 h-11"
                        >
                          <span>Add new activity</span>
                          <Plus class="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <!-- Add Module Button (if needed, but design implies simpler structure) -->
                    <div v-if="(sectionsList[selectedSection!]?.modules.length || 0) === 0" class="text-center py-8">
                       <Button @click="addModule(selectedSection!)" variant="outline">
                         Add Module for Activities
                       </Button>
                    </div>
                  </div>
                </div>

                <div class="flex justify-end mt-4 pt-4 border-t border-gray-100/50">
                  <Button 
                    @click="() => handleSubmit(false, false)" 
                    :disabled="submitting"
                    class="bg-slate-900 hover:bg-slate-800 text-white px-8 h-9"
                  >
                    {{ submitting ? 'Saving...' : 'Save' }}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <!-- Bottom Action Buttons -->
      <div class="flex justify-end gap-4 mt-8">
        <Button 
          variant="outline" 
          @click="() => handleSubmit(true, true)" 
          :disabled="!isBasicInfoValid || submitting"
          class="border-gray-300 px-8"
        >
          {{ submitting ? 'Saving...' : 'Save draft' }}
        </Button>
        <Button 
          @click="() => handleSubmit(false, true)" 
          :disabled="!isBasicInfoValid || submitting" 
          class="bg-slate-900 hover:bg-slate-800 text-white px-8"
        >
          {{ submitting ? 'Saving...' : 'Save' }}
        </Button>
      </div>
    </div>
  </div>
</template>