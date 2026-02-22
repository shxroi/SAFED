<script lang="ts" setup>
import { computed, ref } from "vue";
import { ChevronsUpDown, Minus, Plus, Search } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ChecklistToolInput } from "@/composables/operation/useChecklistBuilder";

interface ToolOption {
  id: number;
  name: string;
}

const props = defineProps<{
  toolsList: ChecklistToolInput[];
  toolOptions: ToolOption[];
  submitting: boolean;
}>();

const emit = defineEmits<{
  "toggle-tool": [toolId: number, checked: boolean];
  "increment-tool": [toolId: number];
  "decrement-tool": [toolId: number];
  save: [];
}>();

const search = ref("");
const pickerOpen = ref(false);

const selectedToolsMap = computed(() => {
  const map = new Map<number, number>();
  for (const selectedTool of props.toolsList) {
    if (selectedTool.toolId) {
      map.set(selectedTool.toolId, selectedTool.quantity);
    }
  }
  return map;
});

const selectedTools = computed(() => {
  return props.toolOptions
    .filter((tool) => selectedToolsMap.value.has(tool.id))
    .map((tool) => ({
      ...tool,
      quantity: selectedToolsMap.value.get(tool.id) || 1,
    }));
});

const filteredTools = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  if (!keyword) return props.toolOptions;
  return props.toolOptions.filter((tool) =>
    tool.name.toLowerCase().includes(keyword),
  );
});

const selectedCount = computed(() => selectedToolsMap.value.size);

const getQuantity = (toolId: number): number => {
  return selectedToolsMap.value.get(toolId) ?? 0;
};

const isSelected = (toolId: number): boolean => {
  return selectedToolsMap.value.has(toolId);
};

const handleToggle = (toolId: number, event: Event) => {
  const target = event.target as HTMLInputElement;
  emit("toggle-tool", toolId, target.checked);
};

const handleDecrement = (toolId: number, currentQuantity: number) => {
  if (currentQuantity <= 1) {
    emit("toggle-tool", toolId, false);
    return;
  }

  emit("decrement-tool", toolId);
};
</script>

<template>
  <div>
    <h1 class="mb-6 text-xl font-semibold text-gray-900">Tools</h1>

    <div class="space-y-4">
      <Popover v-model:open="pickerOpen">
        <PopoverTrigger as-child>
          <Button
            variant="outline"
            role="combobox"
            :aria-expanded="pickerOpen"
            class="h-10 w-full justify-between border-gray-200 bg-white font-normal"
          >
            <span class="truncate text-sm">
              {{
                selectedCount > 0
                  ? `${selectedCount} tool(s) selected`
                  : "Select tools"
              }}
            </span>
            <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          class="w-[--radix-popover-trigger-width] space-y-3 p-3"
          align="start"
        >
          <div class="relative">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              v-model="search"
              placeholder="Search tools..."
              class="h-9 pl-9"
            />
          </div>

          <div class="max-h-64 overflow-y-auto rounded-md border border-gray-200">
            <div
              v-if="filteredTools.length === 0"
              class="px-3 py-5 text-sm text-muted-foreground"
            >
              No tools found.
            </div>

            <label
              v-for="toolOption in filteredTools"
              :key="toolOption.id"
              :for="`tool-${toolOption.id}`"
              class="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-3 py-2.5 text-sm last:border-b-0 hover:bg-gray-50"
            >
              <input
                :id="`tool-${toolOption.id}`"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-slate-900 focus:ring-slate-500"
                :checked="isSelected(toolOption.id)"
                @change="(event) => handleToggle(toolOption.id, event)"
              />
              <span class="truncate text-gray-900">{{ toolOption.name }}</span>
            </label>
          </div>
        </PopoverContent>
      </Popover>

      <div class="w-full rounded-lg border border-gray-200 bg-white">
        <div
          v-if="selectedTools.length === 0"
          class="px-4 py-6 text-sm text-muted-foreground"
        >
          No tools selected.
        </div>

        <div
          v-for="tool in selectedTools"
          :key="tool.id"
          class="flex w-full items-center justify-between gap-3 border-b border-gray-100 p-4 last:border-b-0"
        >
          <span class="min-w-0 flex-1 truncate text-sm text-gray-900">{{
            tool.name
          }}</span>

          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              class="h-9 w-9 transition-colors"
              :class="{
                'border-red-200 text-red-500 hover:bg-red-50':
                  getQuantity(tool.id) <= 1,
              }"
              :aria-label="
                getQuantity(tool.id) <= 1 ? 'Remove tool' : 'Decrease quantity'
              "
              @click="handleDecrement(tool.id, getQuantity(tool.id))"
            >
              <Minus class="h-4 w-4" />
            </Button>

            <span class="w-8 text-center text-sm font-medium">
              {{ tool.quantity }}
            </span>

            <Button
              variant="outline"
              size="icon"
              class="h-9 w-9"
              @click="emit('increment-tool', tool.id)"
            >
              <Plus class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-8 flex justify-end border-t pt-6">
      <Button
        :disabled="props.submitting"
        class="w-full bg-slate-900 px-8 text-white hover:bg-slate-800 sm:w-auto"
        @click="emit('save')"
      >
        {{ props.submitting ? "Saving..." : "Save Checklist" }}
      </Button>
    </div>
  </div>
</template>
