<script setup lang="ts">
import {
  Building2,
  Calendar,
  Eye,
  MapPin,
  MoreVertical,
  Pencil,
  Trash2,
  UserCheck,
  Users,
} from "lucide-vue-next";
import type { Operation } from "../../../shared/types/operation";
import {
  OPERATION_STATUS_BADGE_CLASS,
  OPERATION_TYPE_BADGE_CLASS,
} from "@/constants/operation";

const props = defineProps<{
  operation: Operation;
  isIM: boolean;
  daysLeft: number | null;
  formattedDate: string;
}>();

const emit = defineEmits<{
  view: [operation: Operation];
  edit: [operation: Operation];
  cancel: [operation: Operation];
  delete: [operation: Operation];
}>();

const title = computed(() => {
  if (props.operation.vesselName) {
    return `${props.operation.vesselName} - ${props.operation.company}`;
  }

  return props.operation.company;
});

const isDateApproaching = computed(() => {
  if (props.daysLeft === null) return false;
  return props.daysLeft <= 3 && props.daysLeft >= 0;
});
</script>

<template>
  <Card
    class="relative cursor-pointer transition-shadow hover:shadow-lg"
    role="button"
    tabindex="0"
    :aria-label="`Open operation ${title}`"
    @click="emit('view', props.operation)"
    @keydown.enter.self.prevent="emit('view', props.operation)"
    @keydown.space.self.prevent="emit('view', props.operation)"
  >
    <CardHeader class="pb-3">
      <div class="flex justify-between items-start mb-2 gap-3">
        <div class="flex items-center gap-2 min-w-0">
          <CardTitle class="text-lg font-semibold line-clamp-1">{{
            title
          }}</CardTitle>
        </div>

        <DropdownMenu v-if="props.isIM">
          <DropdownMenuTrigger as-child @click.stop>
            <Button
              variant="ghost"
              size="icon"
              class="-mr-2 h-8 w-8 shrink-0"
              aria-label="Open operation actions"
            >
              <MoreVertical class="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              class="cursor-pointer"
              @click="emit('view', props.operation)"
            >
              <Eye class="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              v-if="props.operation.status === 'Draft'"
              class="cursor-pointer"
              @click="emit('edit', props.operation)"
            >
              <Pencil class="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              v-if="
                props.operation.status !== 'Complete' &&
                props.operation.status !== 'Cancelled'
              "
              class="text-orange-600 cursor-pointer"
              @click="emit('cancel', props.operation)"
            >
              <Trash2 class="h-4 w-4 mr-2" />
              Cancel Operation
            </DropdownMenuItem>
            <DropdownMenuItem
              v-if="props.operation.status === 'Draft'"
              class="text-red-600 cursor-pointer"
              @click="emit('delete', props.operation)"
            >
              <Trash2 class="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div class="flex gap-2 flex-wrap">
        <Badge
          :class="OPERATION_TYPE_BADGE_CLASS[props.operation.type]"
          class="text-xs font-medium px-2 py-0.5"
        >
          {{ props.operation.type }}
        </Badge>
        <Badge
          :class="OPERATION_STATUS_BADGE_CLASS[props.operation.status]"
          class="text-xs font-medium px-2 py-0.5"
        >
          {{ props.operation.status }}
        </Badge>
      </div>
    </CardHeader>

    <CardContent class="space-y-2 pt-0">
      <div class="flex items-center gap-2 text-sm text-gray-700">
        <MapPin class="h-4 w-4 shrink-0 text-gray-500" />
        <span>{{ props.operation.location }}</span>
      </div>

      <div class="flex items-center justify-between gap-2 text-sm">
        <div class="flex items-center gap-2 text-gray-700">
          <Calendar class="h-4 w-4 shrink-0 text-gray-500" />
          <span>{{ props.formattedDate }}</span>
        </div>
        <Badge
          v-if="isDateApproaching && props.operation.status === 'Draft'"
          class="bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 whitespace-nowrap"
        >
          {{ props.daysLeft }} days left
        </Badge>
      </div>

      <div
        v-if="!props.operation.vesselName"
        class="flex items-center gap-2 text-sm text-gray-700"
      >
        <Building2 class="h-4 w-4 shrink-0 text-gray-500" />
        <span>{{ props.operation.company }}</span>
      </div>

      <div class="flex items-center gap-2 text-sm text-gray-700">
        <Users class="h-4 w-4 shrink-0 text-gray-500" />
        <span>{{ props.operation.assignedStaff || 0 }} Staff assigned</span>
      </div>

      <div class="space-y-1.5 pt-1">
        <div class="flex justify-between items-center">
          <span class="text-sm font-semibold text-gray-900">Progress</span>
          <span class="text-sm font-bold text-gray-900"
            >{{ props.operation.progress || 0 }}%</span
          >
        </div>
        <Progress :model-value="props.operation.progress || 0" class="h-2" />
      </div>

      <div class="pt-2 border-t text-sm">
        <span class="text-gray-600">Supervisor: </span>
        <span class="font-medium text-gray-900">{{
          props.operation.supervisorName || "Not assigned"
        }}</span>
      </div>
    </CardContent>
  </Card>
</template>
