<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Building2, 
  Users, 
  Download,
  Check,
  X,
  ChevronDown,
  Upload,
  Eye,
  Menu
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { toast } from "vue-sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'


const route = useRoute()
const router = useRouter()
const { user } = useUserSession()

const operationId = computed(() => parseInt(route.params.id as string))
const isUserEnrolled = ref(false)
const userRole = ref<'SUPERVISOR' | 'STAFF' | null>(null)
const isSupervisor = computed(() => userRole.value === 'SUPERVISOR')

// Access Control
const isIM = computed(() => user.value?.roles === 'IM')
const isObserver = computed(() => user.value?.roles === 'OBSERVER')
// Read-only if user is NOT enrolled AND is either IM or Observer
const isReadOnly = computed(() => !isUserEnrolled.value && (isIM.value || isObserver.value) || operation.value?.status === 'Complete')

interface Tool {
  id: number
  toolId: number
  name: string
  quantity: number
  preStatus: 'Good' | 'Not Good' | null
  postStatus: 'Good' | 'Not Good' | null
  preNote: string | null
  postNote: string | null
}

interface Activity {
  id: number
  jobDescription: string
  documentationRequired: boolean
  status: 'Good' | 'Not Good' | null
  notes: string | null
  executedByName?: string | null
}

interface Module {
  id: number
  name: string
  activities: Activity[]
}

interface Section {
  id: number
  name: string
  modules: Module[]
  isOpen: boolean
}

interface Operation {
  id: number
  vesselName: string
  type: string
  location: string
  company: string
  date: string
  status: string
  supervisorName: string
  staffNames: string[]
}

const operation = ref<Operation | null>(null)
const tools = ref<Tool[]>([])
const sections = ref<Section[]>([])
const loading = ref(true)
const saving = ref(false)
const finishing = ref(false)
const showFinishDialog = ref(false)
const activeTab = ref('tools')
const monitorTab = ref('operation')
const selectedSectionId = ref<number | null>(null)

const fetchOperationDetail = async () => {
  loading.value = true
  try {
    // Fetch operation basic info
    const opResponse = await $fetch<any>(`/api/operations/${operationId.value}`)
    const operationData = opResponse.operation

    // Check if current user is enrolled in this operation
    const userEnrollment = operationData.enrollments?.find(
      (e: any) => e.userId === user.value?.id
    )

    if (userEnrollment) {
      isUserEnrolled.value = true
      userRole.value = userEnrollment.operationRole
    } else {
      // If not enrolled, check if IM or Observer
      if (!isIM.value && !isObserver.value) {
         toast.error('You are not authorized to access this operation')
         router.push('/operations')
         return
      }
      // IM/Observer allowed in read-only mode
    }

    // Get supervisor and staff names
    const supervisor = operationData.enrollments?.find((e: any) => e.operationRole === 'SUPERVISOR')
    const staffMembers = operationData.enrollments?.filter((e: any) => e.operationRole === 'STAFF')
    
    operation.value = {
      id: operationData.id,
      vesselName: operationData.vesselName,
      type: operationData.type,
      location: operationData.location,
      company: operationData.company,
      date: operationData.date,
      status: operationData.status,
      supervisorName: supervisor?.user?.name || 'Unknown',
      staffNames: staffMembers?.map((s: any) => s.user?.name || 'Unknown') || [],
    }

    // Fetch checklist (tools + sections)
    const checklistResponse = await $fetch<{
      success: boolean
      tools: Tool[]
      sections: Section[]
    }>(`/api/operations/${operationId.value}/checklist`)

    tools.value = checklistResponse.tools || []
    sections.value = (checklistResponse.sections || []).map(s => ({
      ...s,
      isOpen: false
    }))
    
    if (sections.value.length > 0) {
        selectedSectionId.value = sections.value[0].id
    }

  } catch (error: any) {
    console.error('Failed to fetch operation:', error)
    toast.error(error.data?.message || 'Failed to load operation')
    router.push('/operations')
  } finally {
    loading.value = false
  }
}

const setToolCondition = (toolIndex: number, type: 'pre' | 'post', status: 'Good' | 'Not Good') => {
  if (isReadOnly.value) return
  const tool = tools.value[toolIndex]
  if (!tool) return
  
  if (type === 'pre') {
    tool.preStatus = status
  } else {
    tool.postStatus = status
  }
}

const setActivityStatus = (sectionIndex: number, moduleIndex: number, activityIndex: number, status: 'Good' | 'Not Good') => {
  if (isReadOnly.value) return
  const section = sections.value[sectionIndex]
  const module = section?.modules?.[moduleIndex]
  const activity = module?.activities?.[activityIndex]
  if (activity) {
    activity.status = status
  }
}

const toggleSection = (index: number) => {
  const section = sections.value[index]
  if (section) {
    section.isOpen = !section.isOpen
  }
}

const saveTools = async () => {
  if (isReadOnly.value) return
  saving.value = true
  try {
    await $fetch(`/api/operations/${operationId.value}/tools`, {
      method: 'PUT',
      body: { 
        tools: tools.value.map(t => ({
          id: t.id,
          preStatus: t.preStatus,
          postStatus: t.postStatus,
          preNote: t.preNote,
          postNote: t.postNote
        }))
      }
    })
    toast.success('Tools checklist saved successfully')
    await fetchOperationDetail()
  } catch (error: any) {
    console.error('Failed to save tools:', error)
    toast.error(error.data?.message || 'Failed to save tools')
  } finally {
    saving.value = false
  }
}

const saveActivity = async (activity: Activity) => {
  if (isReadOnly.value) return
  saving.value = true
  try {
    await $fetch(`/api/operations/${operationId.value}/tasks/${activity.id}`, {
      method: 'PUT',
      body: {
        status: activity.status,
        notes: activity.notes
      }
    })
    toast.success('Activity saved successfully')
  } catch (error: any) {
    console.error('Failed to save activity:', error)
    toast.error(error.data?.message || 'Failed to save activity')
  } finally {
    saving.value = false
  }
}

const finishOperation = async () => {
  if (isReadOnly.value) return
  finishing.value = true
  try {
    await $fetch(`/api/operations/${operationId.value}/complete`, {
      method: 'POST'
    })
    toast.success('Operation completed successfully')
    showFinishDialog.value = false
    navigateTo('/operations')
  } catch (error: any) {
    console.error('Failed to finish operation:', error)
    toast.error(error.data?.message || 'Failed to finish operation')
  } finally {
    finishing.value = false
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active': return 'bg-green-100 text-green-700 border-green-200'
    case 'Draft': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'Complete': return 'bg-gray-100 text-gray-700 border-gray-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

const getTypeColor = (type: string) => {
  const typeMap: Record<string, string> = {
    'Installation': 'bg-purple-100 text-purple-700 border-purple-200',
    'Maintenance': 'bg-orange-100 text-orange-700 border-orange-200',
    'SAT/Commissioning': 'bg-blue-100 text-blue-700 border-blue-200',
    'Upgrade': 'bg-teal-100 text-teal-700 border-teal-200',
    'Uninstall': 'bg-red-100 text-red-700 border-red-200',
  }
  return typeMap[type] || 'bg-gray-100 text-gray-700 border-gray-200'
}

const goBack = () => {
  navigateTo('/operations')
}

// Progress calculation
const calculateProgress = computed(() => {
    // This is a placeholder. Real progress would be calculated based on completed tasks / total tasks
    let totalTasks = tools.value.length * 2 // Pre & Post
    let completedTasks = 0
    tools.value.forEach(t => {
        if(t.preStatus) completedTasks++
        if(t.postStatus) completedTasks++
    })
    
    sections.value.forEach(s => {
        s.modules.forEach(m => {
            totalTasks += m.activities.length
            m.activities.forEach(a => {
                if(a.status) completedTasks++
            })
        })
    })

    if (totalTasks === 0) return 0
    return Math.round((completedTasks / totalTasks) * 100)
})

const selectedSection = computed(() => {
    return sections.value.find(s => s.id === selectedSectionId.value)
})


onMounted(() => {
  fetchOperationDetail()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-48">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div class="px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
             <Button variant="ghost" size="icon" @click="goBack" v-if="!isReadOnly">
              <ArrowLeft class="h-5 w-5" />
            </Button>
            <div v-else class="flex items-center gap-2">
                 <!-- Hamburger for mobile monitor view? Or just simple header -->
                 <span class="font-bold text-lg">Manage user</span>
            </div>
            <h1 class="text-lg font-semibold text-gray-900" v-if="!isReadOnly">Operations</h1>
             <Badge v-if="isReadOnly" variant="secondary" class="gap-1 ml-2">
               {{ user?.username || 'User' }}
            </Badge>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>


    <div v-else-if="operation && !isReadOnly" class="p-4">
      <!-- Operation Info Card -->
      <Card class="border border-gray-200 shadow-sm mb-6">
        <CardContent class="p-4">
          <!-- Header -->
          <div class="mb-4">
            <h2 class="font-semibold text-lg text-gray-900 mb-2">
              {{ operation.vesselName }}
            </h2>
            <div class="flex items-center gap-2 flex-wrap">
              <Badge :class="getTypeColor(operation.type)" variant="outline" class="text-xs">
                {{ operation.type }}
              </Badge>
              <Badge :class="getStatusColor(operation.status)" variant="outline" class="text-xs capitalize">
                {{ operation.status }}
              </Badge>
            </div>
          </div>

          <!-- Details -->
          <div class="space-y-2 text-sm text-gray-600 mb-4">
            <div class="flex items-center gap-2">
              <MapPin class="h-4 w-4 text-gray-400 shrink-0" />
              <span>{{ operation.location }}</span>
            </div>
             <div class="flex items-center gap-2">
              <Calendar class="h-4 w-4 text-gray-400 shrink-0" />
              <span>{{ formatDate(operation.date) }}</span>
              <span class="ml-auto text-xs text-gray-400">2 days left</span>
            </div>
            <div class="flex items-center gap-2">
              <Building2 class="h-4 w-4 text-gray-400 shrink-0" />
              <span>{{ operation.company }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Users class="h-4 w-4 text-gray-400 shrink-0" />
              <span>{{ operation.staffNames?.join(', ') || 'No staff assigned' }}</span>
            </div>
          </div>
          
           <!-- Progress -->
          <div class="space-y-2 mb-4">
             <div class="flex justify-between text-sm font-medium">
                <span>Progress</span>
                <span>{{ calculateProgress }}%</span>
             </div>
             <Progress :model-value="calculateProgress" class="h-2" />
          </div>


          <!-- Supervisor -->
          <div class="pt-3 border-t border-gray-100">
            <p class="text-sm text-gray-600">
              Supervisor: <span class="font-medium text-gray-900">{{ operation.supervisorName }}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <!-- Checklist Section -->
      <Card class="border border-gray-200 shadow-sm mb-6">
        <CardContent class="p-0">
          <div class="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 class="font-semibold text-gray-900">Checklist</h3>
            <div class="flex bg-gray-100 rounded-lg p-1">
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    :class="['h-7 px-3 text-xs rounded-md', activeTab === 'tools' ? 'bg-white shadow-sm font-medium' : 'text-gray-500']"
                    @click="activeTab = 'tools'"
                 >
                    Tools
                 </Button>
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    :class="['h-7 px-3 text-xs rounded-md', activeTab === 'operation' ? 'bg-white shadow-sm font-medium' : 'text-gray-500']"
                    @click="activeTab = 'operation'"
                 >
                    Operation
                 </Button>
            </div>
          </div>

          <div v-if="activeTab === 'tools'" class="p-4 space-y-4">
              <!-- Tool List -->
               <div 
                v-for="(tool, toolIndex) in tools" 
                :key="tool.id"
                class="bg-slate-50 border border-gray-200 rounded-lg p-4"
              >
                 <div class="flex items-center justify-between mb-4">
                  <h4 class="font-medium text-gray-900">{{ tool.name }}</h4>
                   <span class="text-sm font-medium">QTY : {{ tool.quantity }}</span>
                </div>

                <!-- Pre Condition -->
                <div class="space-y-3 mb-4 border-b border-gray-200 pb-4">
                     <div class="flex items-center justify-between">
                         <span class="text-sm text-gray-600">Pre condition</span>
                         <div class="flex gap-2" v-if="!tool.preStatus">
                             <Button size="sm" class="bg-green-300 hover:bg-green-400 text-green-800 w-12 h-8" @click="setToolCondition(toolIndex, 'pre', 'Good')">
                                 <Check class="w-4 h-4" />
                             </Button>
                              <Button size="sm" class="bg-red-300 hover:bg-red-400 text-red-800 w-12 h-8" @click="setToolCondition(toolIndex, 'pre', 'Not Good')">
                                 <X class="w-4 h-4" />
                             </Button>
                         </div>
                         <Badge v-else :class="tool.preStatus === 'Good' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                             {{ tool.preStatus }}
                         </Badge>
                     </div>
                     <Textarea 
                        v-if="tool.preStatus === 'Not Good'"
                        v-model="tool.preNote"
                        placeholder="Type tool note here"
                        class="bg-white"
                      />
                </div>

                <!-- Post Condition -->
                 <div class="space-y-3">
                     <div class="flex items-center justify-between">
                         <span class="text-sm text-gray-600">Post condition</span>
                          <div class="flex gap-2" v-if="!tool.postStatus">
                             <!-- Disabled post condition until pre is done? Optional -->
                             <Button size="sm" class="bg-green-300 hover:bg-green-400 text-green-800 w-12 h-8" @click="setToolCondition(toolIndex, 'post', 'Good')">
                                 <Check class="w-4 h-4" />
                             </Button>
                              <Button size="sm" class="bg-red-300 hover:bg-red-400 text-red-800 w-12 h-8" @click="setToolCondition(toolIndex, 'post', 'Not Good')">
                                 <X class="w-4 h-4" />
                             </Button>
                         </div>
                         <Badge v-else :class="tool.postStatus === 'Good' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                             {{ tool.postStatus }}
                         </Badge>
                     </div>
                      <Textarea 
                        v-if="tool.postStatus === 'Not Good'"
                        v-model="tool.postNote"
                        placeholder="Lorem ipsum dolor sit amet.... begitulah notenya"
                        class="bg-white"
                      />
                </div>
                 
                 <!-- Save Button for Tool -->
                 <Button class="w-full mt-4 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200" @click="saveTools">
                     Save
                 </Button>

              </div>
          </div>
          
           <div v-if="activeTab === 'operation'" class="p-4 space-y-4">
               <!-- Collapsible Sections -->
               <Collapsible
                v-for="(section, sectionIndex) in sections"
                :key="section.id"
                v-model:open="section.isOpen"
              >
                  <CollapsibleTrigger as-child>
                  <Button
                    variant="ghost"
                    class="w-full justify-between p-4 h-auto bg-slate-50 border border-gray-200 rounded-lg hover:bg-slate-100 mb-2"
                  >
                    <span class="font-medium text-gray-900">{{ section.name }}</span>
                    <ChevronDown 
                      :class="['h-5 w-5 text-gray-400 transition-transform', section.isOpen && 'rotate-180']" 
                    />
                  </Button>
                </CollapsibleTrigger>
                
                 <CollapsibleContent class="space-y-3">
                     <div v-for="(module, moduleIndex) in section.modules" :key="module.id">
                        <div v-if="module.activities.length === 0" class="text-sm text-gray-500 italic p-4 text-center">
                            No activities in this section
                        </div>
                        <div
                            v-for="(activity, activityIndex) in module.activities"
                            :key="activity.id"
                            class="bg-white border border-gray-200 rounded-lg p-4 mb-3"
                        >
                            <p class="text-sm text-gray-900 mb-4">{{ activity.jobDescription }}</p>
                             <div class="flex items-center justify-between mb-4">
                                 <span class="text-sm font-medium text-gray-700">Condition</span>
                                 <div class="flex gap-2" v-if="!activity.status">
                                     <Button size="sm" class="bg-green-300 hover:bg-green-400 text-green-800 w-12 h-8" @click="setActivityStatus(sectionIndex, moduleIndex, activityIndex, 'Good')">
                                         <Check class="w-4 h-4" />
                                     </Button>
                                      <Button size="sm" class="bg-red-300 hover:bg-red-400 text-red-800 w-12 h-8" @click="setActivityStatus(sectionIndex, moduleIndex, activityIndex, 'Not Good')">
                                         <X class="w-4 h-4" />
                                     </Button>
                                 </div>
                                 <Badge v-else :class="activity.status === 'Good' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                                     {{ activity.status }}
                                 </Badge>
                             </div>
                             
                             <Textarea 
                                v-model="activity.notes"
                                placeholder="Type tool note here"
                                class="mb-4 bg-gray-50"
                              />
                              
                              <Button class="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium" @click="saveActivity(activity)">
                                  Save
                              </Button>

                        </div>
                     </div>
                 </CollapsibleContent>

              </Collapsible>
           </div>

        </CardContent>
      </Card>
      
       <!-- Fixed Bottom Actions -->
        <div 
        class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50"
        >
        <Button 
            v-if="isSupervisor"
            variant="outline"
            class="w-full border-slate-900 text-slate-900 hover:bg-slate-50 h-12"
            :disabled="operation.status === 'Complete'"
            @click="showFinishDialog = true"
        >
            Finished Operation
        </Button>
        </div>
    </div>


    <!-- 
      ================================================================
      MONITORING VIEW (Desktop/Web)
      ================================================================
    -->
    <div v-else-if="operation && isReadOnly" class="p-8 max-w-7xl mx-auto">
      <div class="grid grid-cols-12 gap-8">
          
        <!-- Left Column: Report Details -->
        <div class="col-span-12">
            <Card class="mb-6">
                <CardHeader class="flex flex-row items-center justify-between">
                     <div class="flex items-center gap-2">
                         <div class="p-2 bg-gray-100 rounded-lg">
                              <Download class="w-5 h-5 text-gray-600" />
                         </div>
                         <CardTitle class="text-base font-medium">{{ operation.type }} - {{ operation.vesselName }}</CardTitle>
                     </div>
                     <Download class="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600" />
                </CardHeader>
                <CardContent>
                    <div class="grid grid-cols-2 gap-8 mb-6">
                         <div class="space-y-3 text-sm">
                             <div class="flex gap-2">
                                 <MapPin class="w-4 h-4 text-gray-400" />
                                 <span>{{ operation.location }}, {{ formatDate(operation.date) }}</span>
                             </div>
                             <div class="flex gap-2">
                                 <Building2 class="w-4 h-4 text-gray-400" />
                                 <span>{{ operation.company }}</span>
                             </div>
                         </div>
                         <div class="space-y-3 text-sm">
                             <div class="flex gap-2">
                                 <Users class="w-4 h-4 text-gray-400" />
                                 <span>{{ operation.supervisorName }}</span>
                             </div>
                             <div class="flex gap-2">
                                 <Users class="w-4 h-4 text-gray-400" />
                                 <span>{{ operation.staffNames.join(', ') }}</span>
                             </div>
                         </div>
                    </div>
                    
                    <div class="space-y-2">
                        <div class="flex justify-between text-sm font-medium">
                            <span>Progress</span>
                            <span>{{ calculateProgress }}%</span>
                        </div>
                        <Progress :model-value="calculateProgress" class="h-2 bg-slate-100" />
                    </div>
                </CardContent>
            </Card>
        </div>
        
        <!-- Checklist Section -->
        <div class="col-span-12">
             <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold">Checklist</h2>
                <div class="bg-gray-100 p-1 rounded-lg inline-flex">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        :class="['text-xs rounded-md', monitorTab === 'operation' ? 'bg-white shadow-sm font-medium' : 'text-gray-500']"
                        @click="monitorTab = 'operation'"
                    >
                        Operation
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        :class="['text-xs rounded-md', monitorTab === 'tools' ? 'bg-white shadow-sm font-medium' : 'text-gray-500']"
                        @click="monitorTab = 'tools'"
                    >
                        Tools
                    </Button>
                </div>
            </div>
            
            <!-- Operation Tab Content -->
            <div v-if="monitorTab === 'operation'" class="grid grid-cols-12 gap-6">
                <!-- Sidebar Navigation -->
                <div class="col-span-3 space-y-2">
                     <div 
                        v-for="section in sections" 
                        :key="section.id"
                        :class="['p-3 rounded-lg cursor-pointer text-sm font-medium transition-colors', selectedSectionId === section.id ? 'bg-slate-100 text-slate-900 border border-slate-200' : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50']"
                        @click="selectedSectionId = section.id"
                     >
                         <div class="flex justify-between items-center">
                             {{ section.name }}
                             <ChevronDown v-if="selectedSectionId !== section.id" class="w-4 h-4 text-gray-400 -rotate-90" />
                             <ChevronDown v-else class="w-4 h-4 text-gray-900" />
                         </div>
                     </div>
                </div>

                <!-- Main Content Area -->
                <div class="col-span-9">
                    <Card v-if="selectedSection">
                        <CardHeader>
                            <CardTitle class="text-lg">{{ selectedSection.name }}</CardTitle>
                        </CardHeader>
                        <CardContent class="space-y-4">
                             <div v-for="module in selectedSection.modules" :key="module.id">
                                 <div v-if="module.activities.length === 0" class="text-center py-8 text-gray-400 italic">
                                     No activities here
                                 </div>
                                 <div 
                                    v-for="activity in module.activities" 
                                    :key="activity.id"
                                    class="border border-gray-100 rounded-lg p-4 mb-4"
                                 >
                                     <div class="flex justify-between items-start mb-3">
                                         <div class="text-xs text-gray-500 flex items-center gap-2">
                                             <span class="font-bold bg-gray-100 px-1 rounded">CN</span> 
                                             <span>{{ activity.executedByName || 'Unknown Staff' }}</span>
                                             <span>•</span>
                                             <span>14.32</span> <!-- Placeholder time -->
                                         </div>
                                         <Badge 
                                            v-if="activity.status"
                                            :class="activity.status === 'Good' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'"
                                         >
                                             {{ activity.status === 'Good' ? 'Good condition' : 'Bad condition' }}
                                         </Badge>
                                         <Badge v-else variant="outline" class="text-gray-400">Pending</Badge>
                                     </div>
                                     
                                     <p class="text-sm text-gray-900 mb-3">{{ activity.jobDescription }}</p>
                                     
                                     <div v-if="activity.notes" class="bg-slate-50 p-3 rounded text-sm text-gray-600 italic">
                                         <span class="font-medium text-slate-900 not-italic block mb-1">Note:</span>
                                         {{ activity.notes }}
                                     </div>
                                 </div>
                             </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <!-- Tools Tab Content -->
            <div v-if="monitorTab === 'tools'" class="col-span-12">
                 <div class="space-y-4">
                     <Card v-for="tool in tools" :key="tool.id">
                        <CardContent class="p-4">
                             <div class="flex items-center justify-between mb-4">
                                <h4 class="font-medium text-gray-900">{{ tool.name }}</h4>
                                <Badge variant="outline">Qty: {{ tool.quantity }}</Badge>
                             </div>
                             
                             <div class="grid grid-cols-2 gap-8">
                                 <!-- Pre Condition -->
                                 <div class="space-y-2">
                                     <div class="flex items-center justify-between text-sm">
                                         <span class="text-gray-500">Pre-Condition</span>
                                         <Badge 
                                            v-if="tool.preStatus"
                                            :class="tool.preStatus === 'Good' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                                         >
                                            {{ tool.preStatus }}
                                        </Badge>
                                        <span v-else class="text-gray-400">-</span>
                                     </div>
                                      <p v-if="tool.preNote" class="text-sm text-gray-600 bg-gray-50 p-2 rounded italic">
                                          "{{ tool.preNote }}"
                                      </p>
                                 </div>
                                 
                                 <!-- Post Condition -->
                                 <div class="space-y-2">
                                     <div class="flex items-center justify-between text-sm">
                                         <span class="text-gray-500">Post-Condition</span>
                                         <Badge 
                                            v-if="tool.postStatus"
                                            :class="tool.postStatus === 'Good' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                                         >
                                            {{ tool.postStatus }}
                                        </Badge>
                                        <span v-else class="text-gray-400">-</span>
                                     </div>
                                      <p v-if="tool.postNote" class="text-sm text-gray-600 bg-gray-50 p-2 rounded italic">
                                          "{{ tool.postNote }}"
                                      </p>
                                 </div>
                             </div>
                        </CardContent>
                     </Card>
                     
                     <div v-if="tools.length === 0" class="text-center py-12 text-gray-500 italic">
                         No tools listed for this operation.
                     </div>
                 </div>
            </div>
        </div>

      </div>
    </div>


    <!-- Finish Confirmation Dialog -->
    <AlertDialog v-model:open="showFinishDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Finish Operation?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to mark this operation as completed? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="finishing">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            :disabled="finishing"
            @click="finishOperation"
          >
            {{ finishing ? 'Finishing...' : 'Finish' }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>