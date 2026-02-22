<script lang="ts" setup>
import { ChevronRight, Plus } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import type { ChecklistSectionInput } from "@/composables/operation/useChecklistBuilder";

const props = defineProps<{
  checklistView: "tools" | "operation";
  sectionsList: ChecklistSectionInput[];
  selectedSection: number | null;
}>();

const emit = defineEmits<{
  "update:checklistView": [value: "tools" | "operation"];
  "select-section": [index: number];
  "add-section": [];
}>();
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center self-stretch">
      <!-- Title -->
      <h2 class="text-xl font-semibold text-gray-900">Checklist</h2>

      <!-- Tab Toggle -->
      <div
        class="flex rounded-lg bg-gray-100 p-1"
        role="tablist"
        aria-label="Checklist mode"
      >
        <Button
          variant="ghost"
              size="sm"
              :class="[
                'text-xs rounded-md hover:bg-white',
            props.checklistView === 'tools'
              ? 'bg-white shadow-sm font-medium'
              : 'text-gray-500 hover:bg-gray-50',
          ]"
          :aria-pressed="props.checklistView === 'tools'"
          @click="emit('update:checklistView', 'tools')"
        >
          Tools
        </Button>
        <Button
          variant="ghost"
            size="sm"
            :class="[
                'text-xs rounded-md hover:bg-white',
            props.checklistView === 'operation'
              ? 'bg-white shadow-sm font-medium'
              : 'text-gray-500 hover:bg-gray-50',
          ]"
          :aria-pressed="props.checklistView === 'operation'"
          @click="emit('update:checklistView', 'operation')"
        >
          Operation
        </Button>
      </div>
    </div>

    <!-- Tools nav item -->
      <div v-if="props.checklistView === 'tools'">
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-left text-sm font-medium text-slate-900"
        >
          <span>Tools</span>
          <ChevronRight class="h-4 w-1 text-gray-400" />
        </button>
      </div>
    

    <!-- Operation section list -->
    <div v-if="props.checklistView === 'operation'" class="space-y-2">
      <button
        v-for="(section, index) in props.sectionsList"
        :key="index"
        type="button"
        :class="[
          'flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
          props.selectedSection === index
            ? 'border-slate-300 bg-slate-100 font-medium text-slate-900'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
        ]"
        @click="emit('select-section', index)"
      >
        <span>{{ section.name || "Untitled Section" }}</span>
        <ChevronRight
          :class="[
            'h-4 w-4 text-gray-400 transition-transform',
            props.selectedSection === index ? '' : '-rotate-90',
          ]"
        />
      </button>
      

      <Button
        variant="ghost"
        size="sm"
        class="w-full justify-start text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        @click="emit('add-section')"
      >
        <Plus class="mr-2 h-4 w-4" />
        Add new section
      </Button>
    </div>
  </div>
</template>