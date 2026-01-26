<script setup lang="ts">
import { LayoutDashboard, Users, Settings, LogOut, Menu } from 'lucide-vue-next'
import safedLogo from '@/assets/images/safed.png'


const route = useRoute()

const currentPage = computed(() => {
  const name = route.name?.toString() || 'Dashboard'
  return name.charAt(0).toUpperCase() + name.slice(1)
})

const user = {
  name: 'Awang', 
  email: 'awang@safed.id' 
}
</script>

<template>
  <div class="flex min-h-screen bg-slate-50 font-sans">
    <!-- Sidebar -->  
    <aside class="hidden md:flex w-64 flex-col bg-white border-r border-slate-200">
      <div class="p-6 border-b border-slate-100 flex items-center gap-2">
        <img :src="safedLogo" alt="safedlogo" class="h-8 flex items-center" />
      </div>
      
      <nav class="flex-1 p-4 space-y-2">
        <NuxtLink 
          to="/users" 
          class="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-all duration-200 group"
          active-class="bg-slate-900 text-white shadow-sm"
        >
          <Users class="w-5 h-5" />
          <span>Users</span>
        </NuxtLink>
      </nav>
      <div class="p-4 border-t border-slate-100">
        <button class="flex items-center gap-3 px-4 py-2 w-full text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <LogOut class="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col">
      <!-- Top Header -->
      <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
        <div class="flex items-center gap-4">
          <button class="md:hidden text-slate-600">
            <Menu class="w-6 h-6"/>
          </button>
          <div class="text-sm text-slate-400">Pages / <span class="text-slate-900">{{ currentPage }}</span></div>
        </div>
        
        <div class="flex items-center gap-4">
          <div class="text-right hidden sm:block">
            <div class="text-sm font-semibold text-slate-900">{{ user.name }}</div>
            <div class="text-xs text-slate-400">{{ user.email}}</div>
          </div>
          <img src="https://i.pravatar.cc/40" alt="User Avatar" class="w-10 h-10 rounded-full"/>
        </div>
      </header>

      <!-- Page Content -->
      <main>
        <slot />
      </main>
    </div>
  </div>
</template>
