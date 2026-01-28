<script lang="ts" setup>
import { Eye, EyeOff } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import safedLogo from '@/assets/images/safed.png'

definePageMeta({
  layout: false,
})

const showPassword = ref(false)
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-white">
    <div class="w-full max-w-sm px-6">
      <!-- Logo Section -->
      <div class="text-center mb-16">
        <img :src="safedLogo" alt="safedlogo" class="h-10 mx-auto mb-6" />
      </div>

      <form class="space-y-4" @submit.prevent>
        <!-- Username Field -->
        <div class="space-y-2">
          <Label class="text-sm font-bold text-slate-900 pl-1">Username</Label>
          <Input 
            placeholder="johndoe" 
            class="w-full rounded-md border-slate-200 px-4 focus-visible:ring-slate-300" 
          />
        </div>

        <!-- Password Field -->
        <div class="space-y-2">
          <Label class="text-sm font-bold text-slate-900 pl-1">Password</Label>
          <div class="relative">
            <Input 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="***" 
              class="w-full rounded-md border-slate-200 px-4 pr-10 focus-visible:ring-slate-300" 
            />
            <button 
              type="button" 
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              @click="showPassword = !showPassword"
            >
              <Eye v-if="!showPassword" class="h-4 w-4" />
              <EyeOff v-else class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="pt-4">
          <NuxtLink to="/users">
            <Button class="w-full bg-blue-950 hover:bg-slate-800 text-white rounded-md font-bold transition-all">
              Sign in
            </Button>
          </NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>