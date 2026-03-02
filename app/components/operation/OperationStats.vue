<script setup lang="ts">
import { computed } from 'vue'
import { Activity, FileText, CheckCircle, Layers } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface OperationStats {
  total: number
  active: number
  draft: number
  complete: number
}

const props = defineProps<{
  stats: OperationStats
}>()

const items = computed(() => [
  {
    label: 'Total Operations',
    value: props.stats.total,
    icon: Layers,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
  },
  {
    label: 'Active',
    value: props.stats.active,
    icon: Activity,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    label: 'Draft',
    value: props.stats.draft,
    icon: FileText,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    label: 'Complete',
    value: props.stats.complete,
    icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  }
])
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <Card 
      v-for="item in items" 
      :key="item.label" 
      class="border-slate-200/60 shadow-sm overflow-hidden"
    >
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs font-bold uppercase tracking-wider text-slate-500">
          {{ item.label }}
        </CardTitle>
        <div :class="[item.bg, item.color, 'p-2 rounded-lg']">
          <component :is="item.icon" class="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold text-slate-900 tracking-tight">
          {{ item.value.toLocaleString() }}
        </div>
      </CardContent>
    </Card>
  </div>
</template>