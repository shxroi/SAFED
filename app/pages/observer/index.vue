<script setup lang="ts">
import type { Operation } from '../../../shared/types/operation'
import { useRoute, useRouter } from 'vue-router'
import { useOperationListFilters } from '~/composables/operation/useOperationListFilters'

const route = useRoute()
const router = useRouter()

const {
  searchQuery,
  selectedType,
  selectedDate,
} = useOperationListFilters()

const { data, pending, error } = await useFetch<{ operations: Operation[]; total: number }>('/api/operations', {
  query: computed(() => ({
    search: route.query.search || undefined,
    type: route.query.type || undefined,
    date: route.query.date || undefined,
  })),
})

const operations = computed(() => data.value?.operations || [])

const statusCounts = computed(() => {
  const list = operations.value
  return {
    total: list.length,
    active: list.filter((operation) => operation.status === 'Active').length,
    draft: list.filter((operation) => operation.status === 'Draft').length,
    complete: list.filter((operation) => operation.status === 'Complete').length,
  }
})

const getDaysLeft = (dateString: string | null | undefined): number | null => {
  if (!dateString) return null

  const operationDate = new Date(dateString)
  if (Number.isNaN(operationDate.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  operationDate.setHours(0, 0, 0, 0)

  return Math.ceil((operationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Invalid date'

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Invalid date'

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const handleView = (operation: Operation) => {
  router.push(`/operations/${operation.id}/execute`)
}
</script>

<template>
  <div class="mx-auto max-w-7xl p-4 md:p-8">
    <OperationFilters
      v-model:search="searchQuery"
      v-model:type="selectedType"
      v-model:date="selectedDate"
      :my-only="false"
      :is-i-m="false"
      :show-my-filter="false"
    />

    <OperationStats :stats="statusCounts" />

    <div v-if="pending" class="py-12 text-center" aria-live="polite">
      <p class="text-gray-500">Loading operations...</p>
    </div>

    <div v-else-if="error" class="py-12 text-center" role="alert">
      <p class="text-red-500">Failed to load operations</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <OperationCard
        v-for="operation in operations"
        :key="operation.id"
        :operation="operation"
        :is-i-m="false"
        :days-left="getDaysLeft(operation.date)"
        :formatted-date="formatDate(operation.date)"
        @view="handleView"
        @edit="() => {}"
        @delete="() => {}"
        @cancel="() => {}"
      />
    </div>

    <div v-if="!pending && !error && operations.length === 0" class="text-center py-12">
      <p class="text-gray-500">No operations found</p>
    </div>
  </div>
</template>
