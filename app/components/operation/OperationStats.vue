<script setup lang="ts">
interface OperationStats {
  total: number
  active: number
  draft: number
  complete: number
}

defineProps<{
  stats: OperationStats
}>()
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium">Total Operations</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">{{ stats.total }}</div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium">Active</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">{{ stats.active }}</div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium">Draft</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">{{ stats.draft }}</div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium">Complete</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">{{ stats.complete }}</div>
      </CardContent>
    </Card>
  </div>
</template>
