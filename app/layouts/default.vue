<script setup lang="ts">
import { LayoutDashboard, Users, Settings, LogOut, Menu, Ship } from 'lucide-vue-next'
import safedLogo from '@/assets/images/safed.png'
import Avatar from '@/assets/images/avatar.png'



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
          <span>Users Management</span>
        </NuxtLink>
        <NuxtLink 
          to="/operations" 
          class="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-all duration-200 group"
          active-class="bg-slate-900 text-white shadow-sm"
        >
          <Ship class="w-5 h-5" />
          <span>Manage Operations</span>
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
      <header class="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 w-full">
        <div class="flex items-center gap-4">
          <button class="md:hidden text-slate-600 focus:outline-none">
            <Menu class="w-6 h-6"/>
          </button>
          <!-- Desktop Breadcrumb -->
          <div class="hidden md:block text-sm text-slate-400">Pages / <span class="text-slate-900 font-medium">{{ currentPage }}</span></div>
        </div>
        
        <!-- Mobile Centered Title -->
        <h1 class="md:hidden text-lg font-bold text-slate-900 absolute translate-x-32">Manage user</h1>

        <div class="flex items-center gap-3">
          <div class="text-right hidden md:block">
            <div class="text-sm font-bold text-slate-900 leading-none">{{ user.name }}</div>
            <div class="text-[10px] text-slate-400 mt-1">{{ user.email }}</div>
          </div>
          <!-- Profile Initial Badge -->
          <div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-200 flex items-center justify-center border-2 border-white shadow-sm font-bold text-slate-500 text-xs">
             <img :src="Avatar" alt="User Avatar" class="w-full h-full object-cover" />
          </div>
        </div>
      </header>
      <!-- Page Content -->
      <main>
        <slot />
      </main>
    </div>
  </div>
</template>
