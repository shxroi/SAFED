<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ChevronDown, Filter, Plus, Search } from "lucide-vue-next";
import { type DateValue, parseDate } from "@internationalized/date";
import type { OperationStatus, OperationType } from "../../../shared/types/operation";
import {
  OPERATION_STATUS_OPTIONS,
  OPERATION_TYPE_OPTIONS,
} from "@/constants/operation";

import { Badge } from "@/components/ui/badge";
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

const props = defineProps<{
  search: string;
  types: OperationType[];
  date: string;
  statuses: OperationStatus[];
  isIM: boolean;
}>();

const emit = defineEmits<{
  "update:search": [value: string];
  "update:types": [value: OperationType[]];
  "update:date": [value: string];
  "update:statuses": [value: OperationStatus[]];
  create: [];
}>();

const open = ref(false);
const typeSelectOpen = ref(false);

const calendarValue = ref<DateValue | undefined>(
  props.date ? parseDate(props.date) : undefined,
);

const draftTypes = ref<OperationType[]>([...props.types]);
const draftStatuses = ref<OperationStatus[]>([...props.statuses]);

watch(open, (isOpen) => {
  if (!isOpen) return;

  calendarValue.value = props.date ? parseDate(props.date) : undefined;
  draftTypes.value = [...props.types];
  draftStatuses.value = [...props.statuses];
});

const selectedTypeItems = computed(() =>
  draftTypes.value
    .map(
      (type) => {
        const option = OPERATION_TYPE_OPTIONS.find((item) => item.value === type);
        return {
          value: type,
          label: option?.label || type,
        };
      },
    )
    .filter(Boolean),
);

const toggleType = (type: OperationType): void => {
  if (draftTypes.value.includes(type)) {
    draftTypes.value = draftTypes.value.filter((item) => item !== type);
    return;
  }

  draftTypes.value = [...draftTypes.value, type];
};

const isTypeChecked = (type: OperationType): boolean =>
  draftTypes.value.includes(type);

const toggleStatus = (status: OperationStatus): void => {
  if (draftStatuses.value.includes(status)) {
    draftStatuses.value = draftStatuses.value.filter((item) => item !== status);
    return;
  }

  draftStatuses.value = [...draftStatuses.value, status];
};

const isStatusChecked = (status: OperationStatus): boolean =>
  draftStatuses.value.includes(status);

const applyFilters = (): void => {
  emit(
    "update:date",
    calendarValue.value ? calendarValue.value.toString() : "",
  );
  emit("update:types", [...draftTypes.value]);
  emit("update:statuses", [...draftStatuses.value]);
  open.value = false;
};

const clearAll = (): void => {
  calendarValue.value = undefined;
  draftTypes.value = [];
  draftStatuses.value = [];
};

const activeFilterCount = computed(() => {
  let count = 0;
  if (props.date) count += 1;
  if (props.types.length > 0) count += 1;
  if (props.statuses.length > 0) count += 1;
  return count;
});

const removeType = (type: OperationType): void => {
  toggleType(type);
};
</script>

<template>
  <div
    class="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center"
  >
    <h1 class="text-2xl font-bold tracking-tight text-slate-900">
      Operation List
    </h1>

    <div class="flex w-full flex-wrap items-center gap-3 md:w-auto md:justify-end">
      <div class="relative w-full sm:w-80">
        <Search
          class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        />
        <Input
          :model-value="props.search"
          placeholder="Search operations..."
          class="rounded-md border-gray-300 pl-10 focus-visible:ring-gray-400"
          aria-label="Search operations"
          @update:model-value="
            (value) => emit('update:search', String(value || ''))
          "
        />
      </div>

      <Popover v-model:open="open">
        <PopoverTrigger as-child>
          <Button
            variant="outline"
            class="relative w-full gap-2 sm:w-auto"
            aria-label="Open operation filters"
            :aria-expanded="open"
          >
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
          class="w-72 overflow-hidden rounded-xl p-0 shadow-lg"
        >
          <div
            class="flex items-center justify-between border-b border-slate-100 px-4 py-3"
          >
            <span class="text-sm font-semibold text-slate-800"
              >Filter Operations</span
            >
            <Button
              variant="ghost"
              size="sm"
              class="h-auto px-1 py-0 text-xs text-slate-500 hover:text-slate-700"
              @click="clearAll"
            >
              Clear all
            </Button>
          </div>

          <div class="max-h-[70vh] space-y-5 overflow-y-auto p-4">
            <div class="space-y-2">
              <label class="text-xs font-semibold uppercase text-slate-500"
                >Date</label
              >
              <Calendar
                v-model="calendarValue"
                initial-focus
                class="rounded-md border border-slate-200 p-1 [&_button]:h-7 [&_button]:w-7 [&_table]:text-xs"
              />
            </div>

            <div class="space-y-2">
              <label class="text-xs font-semibold uppercase text-slate-500"
                >Type</label
              >

              <Popover v-model:open="typeSelectOpen">
                <PopoverTrigger as-child>
                  <Button
                    type="button"
                    variant="outline"
                    class="h-auto min-h-9 w-full justify-between"
                    aria-label="Select operation type"
                  >
                    <span v-if="selectedTypeItems.length === 0" class="text-xs text-slate-500"
                      >Choose type</span
                    >
                    <div v-else class="flex min-w-0 flex-1 flex-wrap gap-1 pr-2">
                      <Badge
                        v-for="type in selectedTypeItems"
                        :key="type.value"
                        variant="secondary"
                        class="max-w-full text-xs"
                      >
                        <span class="truncate">{{ type.label }}</span>
                      </Badge>
                    </div>
                    <ChevronDown class="h-3.5 w-3.5 text-gray-400" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent class="w-[220px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search type..." class="h-9" />
                    <CommandList>
                      <CommandEmpty>No type found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          v-for="option in OPERATION_TYPE_OPTIONS"
                          :key="option.value"
                          :value="option.value"
                          @select="toggleType(option.value)"
                        >
                          <div class="flex items-center gap-2">
                            <input
                              type="checkbox"
                              class="rounded border-slate-300"
                              :checked="isTypeChecked(option.value)"
                              readonly
                            />
                            <span>{{ option.label }}</span>
                          </div>
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              
            </div>

            <div class="space-y-2">
              <label class="text-xs font-semibold uppercase text-slate-500"
                >Status</label
              >

              <div class="space-y-2 rounded-md border border-slate-200 p-2">
                <label
                  v-for="status in OPERATION_STATUS_OPTIONS"
                  :key="status.value"
                  class="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    class="rounded border-slate-300"
                    :checked="isStatusChecked(status.value)"
                    @change="toggleStatus(status.value)"
                  />
                  <span>{{ status.label }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
            <Button class="w-full" @click="applyFilters">Apply Filters</Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        v-if="props.isIM"
        class="w-full gap-2 sm:w-auto"
        aria-label="Create new operation"
        @click="emit('create')"
      >
        <Plus class="h-4 w-4" />
        New Operation
      </Button>
    </div>
  </div>
</template>
