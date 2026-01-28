<script lang="ts" setup>
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from 'vue-sonner'
import { Button } from "@/components/ui/button"
import { h } from 'vue'

defineProps<{
  open: boolean
}>()

const emit = defineEmits([
  'update:open',
  'confirm'
])

const handleConfirm = () => {
  emit('confirm')
  toast.error('User deleted successfully')
}

</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="w-[320px] h-[221px] rounded-2xl p-6">
      <DialogHeader class="items-center text-center">
        <DialogTitle class="text-xl font-bold text-slate-900">Are you sure?</DialogTitle>
        <DialogDescription class="text-slate-400 mt-2">
          This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      
      <div class="flex flex-col gap-3">
        <Button 
          variant="default" 
          class="w-full bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg h-11"
          @click="handleConfirm"
        >
          Yes
        </Button>
        <Button 
          variant="outline" 
          class="w-full border-slate-200 text-slate-900 rounded-lg h-11 hover:bg-slate-50"
          @click="emit('update:open', false)"
        >
          No
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>