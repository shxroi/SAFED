<script lang="ts" setup>
import { ref } from "vue";
import { Check, ChevronsUpDown, Minus, Plus } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
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
  "add-tool": [];
  "remove-tool": [index: number];
  increment: [index: number];
  decrement: [index: number];
  save: [];
}>();

// Track open state per tool row
const openPopovers = ref<boolean[]>([]);

const isOpen = (index: number) => openPopovers.value[index] ?? false;
const setOpen = (index: number, value: boolean) => {
  openPopovers.value[index] = value;
};

const selectTool = (index: number, toolId: number) => {
  const item = props.toolsList[index];
  if (item) item.toolId = toolId;
  setOpen(index, false);
};

const getToolName = (toolId: number | null | undefined): string | undefined => {
  if (!toolId) return undefined;
  return props.toolOptions.find((t) => t.id === toolId)?.name;
};

/**
 * Handles the decrement logic.
 * If quantity is 1, it removes the tool.
 * Otherwise, it decrements the count.
 */
const handleDecrement = (index: number, currentQuantity: number) => {
  if (currentQuantity <= 1) {
    emit("remove-tool", index);
  } else {
    emit("decrement", index);
  }
};
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold mb-6 text-gray-900">Tools</h1>
    <div class="space-y-6">
      <div
        v-for="(tool, index) in props.toolsList"
        :key="index"
        class="space-y-4"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Popover
            :open="isOpen(index)"
            @update:open="(v) => setOpen(index, v)"
          >
            <PopoverTrigger as-child>
              <Button
                variant="outline"
                role="combobox"
                :aria-expanded="isOpen(index)"
                class="flex-1 justify-between bg-gray-50 border-gray-200 font-normal"
              >
                <span
                  :class="
                    cn(!getToolName(tool.toolId) && 'text-muted-foreground')
                  "
                >
                  {{ getToolName(tool.toolId) ?? "Select tool" }}
                </span>
                <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              class="w-[--radix-popover-trigger-width] p-0"
              align="start"
            >
              <Command>
                <CommandInput placeholder="Search tool..." />
                <CommandList>
                  <CommandEmpty>No tool found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      v-for="toolOption in props.toolOptions"
                      :key="toolOption.id"
                      :value="toolOption.name"
                      @select="selectTool(index, toolOption.id)"
                    >
                      <Check
                        :class="
                          cn(
                            'mr-2 h-4 w-4',
                            tool.toolId === toolOption.id
                              ? 'opacity-100'
                              : 'opacity-0',
                          )
                        "
                      />
                      {{ toolOption.name }}
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <div class="flex items-center gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="icon"
              class="h-9 w-9 transition-colors"
              :class="{
                'text-red-500 border-red-200 hover:bg-red-50':
                  tool.quantity <= 1,
              }"
              :aria-label="
                tool.quantity <= 1 ? 'Remove tool' : 'Decrease quantity'
              "
              @click="handleDecrement(index, tool.quantity)"
            >
              <Minus v-if="tool.quantity <= 1" class="h-4 w-4" />
              <Minus v-else class="h-4 w-4" />
            </Button>

            <span class="text-sm font-medium w-8 text-center">
              {{ tool.quantity }}
            </span>

            <Button
              variant="outline"
              size="icon"
              class="h-9 w-9"
              @click="emit('increment', index)"
            >
              <Plus class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        class="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        @click="emit('add-tool')"
      >
        <Plus class="h-4 w-4 mr-2" />
        Add new tool
      </Button>
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
