<script lang="ts" setup>
import type { CalendarDate } from "@internationalized/date";
import { User, Users, X } from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OPERATION_TYPE_OPTIONS } from "@/constants/operation";
import type { OperationType } from "../../../../shared/types/operation";

interface StaffMember {
  id: number;
  name: string;
}

const props = defineProps<{
  formData: {
    type: OperationType | "";
    company: string;
    vesselName: string;
    location: string;
    date: Date | null;
    supervisorId: number | null;
    staffIds: number[];
  };
  calendarDate: CalendarDate | undefined;
  isDateOpen: boolean;
  isStaffOpen: boolean;
  supervisors: StaffMember[];
  availableStaff: StaffMember[];
  staffNameById: Map<number, string>;
  isBasicInfoValid: boolean;
  submitting: boolean;
  formatDate: (date: Date | null) => string;
}>();

const emit = defineEmits<{
  "update:isDateOpen": [value: boolean];
  "update:isStaffOpen": [value: boolean];
  "update:calendarDate": [value: CalendarDate | undefined];
  "toggle-staff": [staffId: number];
  "remove-staff": [staffId: number];
  save: [];
}>();

const onCalendarUpdate = (val: unknown) => {
  emit("update:calendarDate", val as CalendarDate | undefined);
};
</script>

<template>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
    <div class="space-y-2">
      <Label class="text-sm font-medium text-gray-900">Type</Label>
      <Select v-model="props.formData.type">
        <SelectTrigger class="bg-gray-50 w-full border-gray-200">
          <SelectValue placeholder="Operation Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="operationType in OPERATION_TYPE_OPTIONS"
            :key="operationType.value"
            :value="operationType.value"
          >
            {{ operationType.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="space-y-2">
      <Label class="text-sm font-medium text-gray-900">Company</Label>
      <Input
        v-model="props.formData.company"
        placeholder="Enter company name"
        class="bg-gray-50 border-gray-200"
      />
    </div>

    <div class="space-y-2">
      <Label class="text-sm font-medium text-gray-900">Vessel name</Label>
      <Input
        v-model="props.formData.vesselName"
        placeholder="Enter vessel name"
        class="bg-gray-50 border-gray-200"
      />
    </div>

    <div class="space-y-2">
      <Label class="text-sm font-medium text-gray-900">Location</Label>
      <Input
        v-model="props.formData.location"
        placeholder="Enter location name"
        class="bg-gray-50 border-gray-200"
      />
    </div>

    <div class="space-y-2">
      <Label class="text-sm font-medium text-gray-900">Date</Label>
      <Popover
        :open="props.isDateOpen"
        @update:open="emit('update:isDateOpen', $event)"
      >
        <PopoverTrigger as-child>
          <Button
            variant="outline"
            class="w-full justify-start text-left font-normal bg-gray-50 border-gray-200 hover:bg-gray-100"
            aria-label="Open operation date picker"
          >
            <span
              :class="props.formData.date ? 'text-gray-900' : 'text-gray-400'"
            >
              {{ props.formatDate(props.formData.date) }}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-auto p-0" align="start">
          <Calendar
            :model-value="props.calendarDate"
            @update:model-value="onCalendarUpdate"
          />
          <div class="p-3 border-t border-gray-100">
            <Button
              size="sm"
              class="w-full bg-slate-900 text-white hover:bg-slate-800 h-8"
              @click="emit('update:isDateOpen', false)"
            >
              Confirm Date
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>

    <div class="space-y-2">
      <Label class="text-sm font-medium text-gray-900">Supervisor</Label>
      <Select v-model="props.formData.supervisorId">
        <SelectTrigger class="bg-gray-50 w-full border-gray-200">
          <div class="flex items-center gap-2 w-full">
            <SelectValue placeholder="Choose a supervisor" />
          </div>
          <User class="h-4 w-4 text-gray-400 pointer-events-none" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="staff in props.supervisors"
            :key="staff.id"
            :value="staff.id"
          >
            {{ staff.name }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>

  <div class="space-y-2 mt-2  ">
    <Label class="text-sm font-medium text-gray-900">Staff</Label>
    <Popover
      :open="props.isStaffOpen"
      @update:open="emit('update:isStaffOpen', $event)"
    >
      <PopoverTrigger as-child>
        <Button
          variant="outline"
          class="w-full justify-between text-left font-normal bg-gray-50 border-gray-200 hover:bg-gray-100 h-auto min-h-[42px] px-3 py-2"
        >
          <div class="flex flex-wrap gap-1.5 flex-1">
            <template v-if="props.formData.staffIds.length > 0">
              <Badge
                v-for="id in props.formData.staffIds"
                :key="id"
                variant="secondary"
                class="pl-2 pr-1 h-6 bg-gray-200 border border-gray-400 text-primary hover:bg-gray-300 flex items-center gap-1.5"
              >
                <User class="h-3 w-3 text-gray-600" />
                <span class="text-xs font-medium">{{
                  props.staffNameById.get(id) || "Unknown"
                }}</span>
                <button
                  type="button"
                  class="rounded-full"
                  :aria-label="`Remove ${props.staffNameById.get(id) || 'staff member'}`"
                  @click.stop="emit('remove-staff', id)"
                >
                  <X class="h-3 w-3" />
                </button>
              </Badge>
            </template>
            <span v-else class="text-gray-400 text-sm">Choose staff</span>
          </div>
          <Users class="h-4 w-4 text-gray-400 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-[min(22rem,calc(100vw-2rem))]" align="start">
        <div class="space-y-1">
          <div class="px-2 py-1.5">
            <p class="text-sm font-medium text-gray-900">
              Select Staff Members
            </p>
            <p class="text-xs text-gray-500 mt-0.5">
              {{ props.formData.staffIds.length }} selected
            </p>
          </div>
          <div class="max-h-60 overflow-y-auto px-1 space-y-1">
            <div
              v-for="staff in props.availableStaff"
              :key="staff.id"
              class="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Checkbox
                :id="`staff-${staff.id}`"
                :checked="props.formData.staffIds.includes(staff.id)"
                @click="emit('toggle-staff', staff.id)"
              />
              <Label
                :for="`staff-${staff.id}`"
                class="text-sm font-normal cursor-pointer flex-1 flex items-center gap-2"
              >
                <User class="h-4 w-4 text-gray-400" />
                {{ staff.name }}
              </Label>
            </div>
            <div
              v-if="props.availableStaff.length === 0"
              class="text-center py-6 text-gray-500"
            >
              <Users class="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p class="text-sm">No staff available</p>
            </div>
          </div>
        </div>
        <div class="pt-3 mt-3 border-t border-gray-100 px-2">
          <Button
            size="sm"
            class="w-full bg-slate-900 text-white hover:bg-slate-800 h-9"
            @click="emit('update:isStaffOpen', false)"
          >
            Done ({{ props.formData.staffIds.length }} selected)
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  </div>

  <div class="mt-6 flex justify-end">
    <Button
      :disabled="!props.isBasicInfoValid || props.submitting"
      class="w-full bg-slate-900 px-8 text-white hover:bg-slate-800 sm:w-auto"
      @click="emit('save')"
    >
      {{ props.submitting ? "Saving..." : "Save" }}
    </Button>
  </div>
</template>
