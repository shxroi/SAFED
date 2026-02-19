<script lang="ts" setup>
import { Building2, Calendar, MapPin, Users } from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Operation } from "../../../shared/types/operation";
import { useOperationFormatters } from "@/composables/operation/useOperationFormatters";

const props = defineProps<{
  operation: Operation;
  progress: number;
  daysLeft: number | null;
  formattedDate: string;
}>();

const { getStatusColor, getTypeColor } = useOperationFormatters();

const title = computed(() =>
  props.operation.vesselName || props.operation.company,
);
</script>

<template>
  <Card class="border border-gray-200 shadow-sm">
    <CardContent class="p-4">
      <div class="mb-4">
        <h2 class="font-semibold text-lg text-gray-900 mb-2">{{ title }}</h2>
        <div class="flex items-center gap-2 flex-wrap">
          <Badge
            :class="getTypeColor(operation.type)"
            variant="outline"
            class="text-xs"
          >
            {{ operation.type }}
          </Badge>
          <Badge
            :class="getStatusColor(operation.status)"
            variant="outline"
            class="text-xs capitalize"
          >
            {{ operation.status }}
          </Badge>
        </div>
      </div>

      <div class="space-y-2 text-sm text-gray-600 mb-4">
        <div class="flex items-center gap-2">
          <MapPin class="h-4 w-4 text-gray-400 shrink-0" />
          <span>{{ operation.location }}</span>
        </div>
        <div class="flex items-center gap-2">
          <Calendar class="h-4 w-4 text-gray-400 shrink-0" />
          <span>{{ formattedDate }}</span>
          <span v-if="daysLeft !== null" class="ml-auto text-xs text-gray-400">
            {{ daysLeft }} days left
          </span>
        </div>
        <div class="flex items-center gap-2">
          <Building2 class="h-4 w-4 text-gray-400 shrink-0" />
          <span>{{ operation.company }}</span>
        </div>
        <div class="flex items-center gap-2">
          <Users class="h-4 w-4 text-gray-400 shrink-0" />
          <span>{{ operation.staffNames?.join(", ") || "No staff assigned" }}</span>
        </div>
      </div>

      <div class="space-y-2 mb-4">
        <div class="flex justify-between text-sm font-medium">
          <span>Progress</span>
          <span>{{ progress }}%</span>
        </div>
        <Progress :model-value="progress" class="h-2" />
      </div>

      <div class="pt-3 border-t border-gray-100">
        <p class="text-sm text-gray-600">
          Supervisor:
          <span class="font-medium text-gray-900">{{ operation.supervisorName }}</span>
        </p>
      </div>
    </CardContent>
  </Card>
</template>
