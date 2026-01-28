<script>
import 'vue-sonner/style.css'
import { Toaster } from '@/components/ui/sonner'
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
      <Toaster position="top-center" rich-colors />
    </NuxtLayout>x
  </div>
</template>
