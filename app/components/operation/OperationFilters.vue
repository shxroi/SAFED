<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Filter, Plus, Search, X, ChevronDown, Calendar as CalendarIcon } from 'lucide-vue-next'
import { type DateValue, getLocalTimeZone, today, parseDate } from '@internationalized/date'
import type { OperationType, OperationStatus } from '../../../shared/types/operation'
import { OPERATION_TYPE_OPTIONS } from '@/constants/operation'

// Shadcn UI Components (Adjust paths to your project)
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

const props = withDefaults(defineProps<{
  search: string
  type: OperationType | 'ALL'
  date: string // Assuming ISO format "YYYY-MM-DD"
  myOnly: boolean
  isIM: boolean
  showMyFilter?: boolean
}>(), {
  showMyFilter: true,
})

const emit = defineEmits<{
  'update:search': [value: string]
  'update:type': [value: OperationType | 'ALL']
  'update:date': [value: string]
  'update:myOnly': [value: boolean]
  create: []
}>()

const open = ref(false)

// --- Date Logic ---
const calendarValue = ref<DateValue | undefined>(
  props.date ? parseDate(props.date) : undefined
)

// --- Type Logic ---
const typeSearch = ref('')
const draftTypes = ref<OperationType[]>(
  props.type === 'ALL' ? [] : [props.type as OperationType]
)

// --- Other Drafts ---
const draftStatuses = ref<OperationStatus[]>([])
const draftMyOnly = ref(props.myOnly)
const OPERATION_STATUSES: OperationStatus[] = ['Draft', 'Active', 'Complete', 'Cancelled']

// Sync when popover opens
watch(open, (val) => {
  if (val) {
    calendarValue.value = props.date ? parseDate(props.date) : undefined
    draftTypes.value = props.type === 'ALL' ? [] : [props.type as OperationType]
    draftMyOnly.value = props.myOnly
  }
})

const toggleType = (type: OperationType) => {
  const idx = draftTypes.value.indexOf(type)
  if (idx === -1) draftTypes.value.push(type)
  else draftTypes.value.splice(idx, 1)
}

const applyFilters = () => {
  const dateString = calendarValue.value ? calendarValue.value.toString() : ''
  emit('update:date', dateString)
  // Note: Your current logic only supports 1 type or ALL via emit. 
  // If you want multi-select in the parent, you'd need to update the prop type.
  emit('update:type', draftTypes.value.length === 1 ? draftTypes.value[0]! : 'ALL')
  emit('update:myOnly', draftMyOnly.value)
  open.value = false
}

const clearAll = () => {
  calendarValue.value = undefined
  draftTypes.value = []
  draftStatuses.value = []
  draftMyOnly.value = false
}

const activeFilterCount = computed(() => {
  let count = 0
  if (props.date) count++
  if (props.type !== 'ALL') count++
  if (props.myOnly) count++
  return count
})
</script>
