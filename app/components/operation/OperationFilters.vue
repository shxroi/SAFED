<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ChevronDown, Filter, Plus, Search, X } from "lucide-vue-next";
import { type DateValue, parseDate } from "@internationalized/date";
import type { OperationType } from "../../../shared/types/operation";
import { OPERATION_TYPE_OPTIONS } from "@/constants/operation";

import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
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

const props = withDefaults(
  defineProps<{
    search: string;
    type: OperationType | "ALL";
    date: string;
    myOnly: boolean;
    isIM: boolean;
    showMyFilter?: boolean;
  }>(),
  {
    showMyFilter: true,
  },
);

const emit = defineEmits<{
  "update:search": [value: string];
  "update:type": [value: OperationType | "ALL"];
  "update:date": [value: string];
  "update:myOnly": [value: boolean];
  create: [];
}>();

const open = ref(false);

const calendarValue = ref<DateValue | undefined>(
  props.date ? parseDate(props.date) : undefined,
);

const draftTypes = ref<OperationType[]>(
  props.type === "ALL" ? [] : [props.type as OperationType],
);

const draftMyOnly = ref(props.myOnly);

watch(open, (isOpen) => {
  if (!isOpen) return;

  calendarValue.value = props.date ? parseDate(props.date) : undefined;
  draftTypes.value = props.type === "ALL" ? [] : [props.type as OperationType];
  draftMyOnly.value = props.myOnly;
});

const toggleType = (type: OperationType): void => {
  const index = draftTypes.value.indexOf(type);
  if (index === -1) {
    draftTypes.value.push(type);
    return;
  }

  draftTypes.value.splice(index, 1);
};

const applyFilters = (): void => {
  emit(
    "update:date",
    calendarValue.value ? calendarValue.value.toString() : "",
  );
  emit(
    "update:type",
    draftTypes.value.length === 1 ? draftTypes.value[0]! : "ALL",
  );
  emit("update:myOnly", draftMyOnly.value);
  open.value = false;
};

const clearAll = (): void => {
  calendarValue.value = undefined;
  draftTypes.value = [];
  draftMyOnly.value = false;
};

const activeFilterCount = computed(() => {
  let count = 0;
  if (props.date) count += 1;
  if (props.type !== "ALL") count += 1;
  if (props.myOnly) count += 1;
  return count;
});
</script>

<template>
  <div
    class="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center"
  >
    <h1 class="text-2xl font-bold tracking-tight text-slate-900">
      Operation List
    </h1>

    <div class="flex flex-wrap items-center gap-3">
      <div class="relative w-64">
        <Search
          class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        />
        <Input
          :model-value="props.search"
          placeholder="Search operations..."
          class="rounded-md border-gray-300 pl-10 focus-visible:ring-gray-400"
          @update:model-value="
            (value) => emit('update:search', String(value || ''))
          "
        />
      </div>

      <Popover v-model:open="open">
        <PopoverTrigger as-child>
          <Button variant="outline" class="relative gap-2">
            <Filter class="h-4 w-4" />
            Filter
            <ChevronDown class="h-3.5 w-3.5 text-gray-400" />
            <span
              v-if="activeFilterCount > 0"
              class="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-semibold text-white"
            >
              {{ activeFilterCount }}
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          class="w-80 overflow-hidden rounded-xl p-0 shadow-lg"
        >
          <div
            class="flex items-center justify-between border-b border-slate-100 px-4 py-3"
          >
            <span class="text-sm font-semibold text-slate-800"
              >Filter Operations</span
            >
            <button
              class="text-xs text-slate-400 hover:text-slate-700"
              @click="clearAll"
            >
              Clear all
            </button>
          </div>

          <div class="max-h-[70vh] space-y-6 overflow-y-auto p-4">
            <div class="space-y-2">
              <Calendar
                v-model="calendarValue"
                initial-focus
                class="rounded-md border border-slate-200"
              />
            </div>

            <div class="space-y-3">
              <label class="text-xs font-semibold uppercase text-slate-500"
                >Type</label
              >

              <div
                v-if="draftTypes.length > 0"
                class="mb-2 flex flex-wrap gap-1.5"
              >
                <div
                  v-for="type in draftTypes"
                  :key="type"
                  class="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800"
                >
                  {{ type }}
                  <X
                    class="h-3 w-3 cursor-pointer hover:text-red-500"
                    @click="toggleType(type)"
                  />
                </div>
              </div>

              <Command class="rounded-md border border-slate-200">
                <CommandInput placeholder="Search types..." class="h-9" />
                <CommandList class="max-h-32">
                  <CommandEmpty>No results.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      v-for="option in OPERATION_TYPE_OPTIONS"
                      :key="option.value"
                      :value="option.value"
                      class="text-xs"
                      @select="toggleType(option.value)"
                    >
                      <div class="flex items-center gap-2">
                        <div
                          class="flex h-3 w-3 items-center justify-center rounded-sm border"
                          :class="
                            draftTypes.includes(option.value)
                              ? 'border-slate-900 bg-slate-900'
                              : 'border-slate-300'
                          "
                        >
                          <div
                            v-if="draftTypes.includes(option.value)"
                            class="h-1.5 w-1.5 rounded-full bg-white"
                          />
                        </div>
                        {{ option.label }}
                      </div>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>

            <div v-if="props.showMyFilter" class="space-y-2">
              <label class="text-xs font-semibold uppercase text-slate-500"
                >Assignment</label
              >
              <label
                class="flex cursor-pointer items-center gap-2 rounded-md border border-slate-100 px-2 py-1.5 hover:bg-slate-50"
              >
                <input
                  v-model="draftMyOnly"
                  type="checkbox"
                  class="rounded border-slate-300"
                />
                <span class="text-xs text-slate-600">Only my operations</span>
              </label>
            </div>
          </div>

          <div class="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
            <Button class="w-full" @click="applyFilters">Apply Filters</Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button v-if="props.isIM" class="gap-2" @click="emit('create')">
        <Plus class="h-4 w-4" />
        New Operation
      </Button>
    </div>
  </div>
</template>
