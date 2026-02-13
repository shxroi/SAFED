<script setup lang="ts">
import { ClipboardList, User, LogOut } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const { user, clear } = useUserSession()

const logout = async () => {
  await clear()
  navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <slot />
    
    <!-- Bottom Navigation (Mobile) -->
    <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 md:hidden">
      <div class="flex items-center justify-around">
        <NuxtLink 
          to="/staff/operations" 
          class="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-blue-600"
          active-class="text-blue-600"
        >
          <ClipboardList class="h-5 w-5" />
          <span class="text-xs">Operations</span>
        </NuxtLink>
        <NuxtLink 
          to="/staff/profile" 
          class="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-blue-600"
          active-class="text-blue-600"
        >
          <User class="h-5 w-5" />
          <span class="text-xs">Profile</span>
        </NuxtLink>
        <button 
          @click="logout"
          class="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-red-600"
        >
          <LogOut class="h-5 w-5" />
          <span class="text-xs">Logout</span>
        </button>
      </div>
    </nav>
  </div>
</template>