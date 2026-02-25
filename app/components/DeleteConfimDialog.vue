<script lang="ts" setup>
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const props = defineProps<{
  open: boolean;
  title?: string;
  description?: string;
}>();

const emit = defineEmits(["update:open", "confirm"]);

const handleConfirm = (): void => {
  emit("confirm");
};

const displayTitle = computed(() => props.title || "Are you sure?");
const displayDescription = computed(
  () => props.description || "This action cannot be undone.",
);
</script>

<template>
  <AlertDialog :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogContent
      class="max-w-[calc(100%-2rem)] rounded-2xl border border-slate-200 p-6 shadow-xl sm:max-w-[560px] sm:p-8"
    >
      <AlertDialogHeader class="space-y-3 text-center sm:min-h-[120px] sm:text-left">
        <AlertDialogTitle class="text-2xl font-semibold tracking-tight text-slate-900">
          {{ displayTitle }}
        </AlertDialogTitle>
        <AlertDialogDescription class="text-base text-slate-500">
          {{ displayDescription }}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter class="mt-4 gap-3 sm:mt-2">
        <AlertDialogAction
          class="h-11 w-full rounded-xl bg-slate-900 text-base font-semibold text-white hover:bg-slate-800 sm:order-2 sm:h-10 sm:w-auto sm:min-w-[88px] sm:px-6"
          @click="handleConfirm"
        >
          Yes
        </AlertDialogAction>
        <AlertDialogCancel
          class="mt-0 h-11 w-full rounded-xl border-slate-200 text-base font-semibold text-slate-900 hover:bg-slate-50 sm:order-1 sm:h-10 sm:w-auto sm:min-w-[88px] sm:px-6"
        >
          No
        </AlertDialogCancel>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
