<script lang="ts" setup>
import { ChevronDown } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  OperationActivity,
  OperationDocumentation,
  OperationSection,
} from "../../../../shared/types/operation-execution";
import type { PendingDocumentation } from "~/composables/operation/useExecutionDocumentation";
import OperationActivityCard from "./OperationActivityCard.vue";

const props = defineProps<{
  sections: OperationSection[];
  editable: boolean;
  maxDocsPerTask: number;
  pendingByTask: Record<number, PendingDocumentation[]>;
  deletedByTask: Record<number, number[]>;
  uploadingByTask: Record<number, boolean>;
}>();

const emit = defineEmits<{
  "set-status": [sectionIndex: number, moduleIndex: number, activityIndex: number, status: "Good" | "Not Good"];
  "update-notes": [activity: OperationActivity, value: string];
  "add-documentation": [activity: OperationActivity, files: File[]];
  "remove-pending": [taskId: number, pendingId: string];
  "mark-delete": [taskId: number, docId: number];
  "undo-delete": [taskId: number, docId: number];
  "open-preview": [path: string, name: string, isLocal?: boolean];
  "save": [activity: OperationActivity];
}>();

const getVisibleDocs = (activity: OperationActivity): OperationDocumentation[] => {
  const deletedIds = new Set(props.deletedByTask[activity.id] || []);
  return (activity.documentations || []).filter((doc) => !deletedIds.has(doc.id));
};

const getDeletedDocs = (activity: OperationActivity): OperationDocumentation[] => {
  const deletedIds = new Set(props.deletedByTask[activity.id] || []);
  return (activity.documentations || []).filter((doc) => deletedIds.has(doc.id));
};

const getPendingDocs = (taskId: number): PendingDocumentation[] =>
  props.pendingByTask[taskId] || [];

const getRemainingSlots = (activity: OperationActivity): number => {
  const used = getVisibleDocs(activity).length + getPendingDocs(activity.id).length;
  return Math.max(0, props.maxDocsPerTask - used);
};

const isUploading = (taskId: number): boolean =>
  !!props.uploadingByTask[taskId];
</script>

<template>
  <div class="space-y-4">
    <Collapsible
      v-for="(section, sectionIndex) in sections"
      :key="section.id"
      v-model:open="section.isOpen"
    >
      <CollapsibleTrigger as-child>
        <Button
          variant="ghost"
          class="mb-2 h-auto w-full justify-between rounded-lg border border-gray-200 bg-slate-50 p-4 text-left hover:bg-slate-100"
          :aria-label="`Toggle section ${section.name}`"
        >
          <span class="font-medium text-gray-900">{{ section.name }}</span>
          <ChevronDown
            :class="[
              'h-5 w-5 text-gray-400 transition-transform',
              section.isOpen && 'rotate-180',
            ]"
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent class="space-y-3">
        <div
          v-for="(module, moduleIndex) in section.modules"
          :key="module.id"
        >
          <div
            v-if="module.activities.length === 0"
            class="text-sm text-gray-500 italic p-4 text-center"
          >
            No activities in this section
          </div>
          <div
            v-for="(activity, activityIndex) in module.activities"
            :key="activity.id"
          >
            <OperationActivityCard
              :activity="activity"
              :editable="editable"
              :max-docs-per-task="maxDocsPerTask"
              :is-uploading="isUploading(activity.id)"
              :visible-docs="getVisibleDocs(activity)"
              :pending-docs="getPendingDocs(activity.id)"
              :deleted-docs="getDeletedDocs(activity)"
              :remaining-slots="getRemainingSlots(activity)"
              @set-status="(status) => emit('set-status', sectionIndex, moduleIndex, activityIndex, status)"
              @update-notes="(value) => emit('update-notes', activity, value)"
              @add-documentation="(files) => emit('add-documentation', activity, files)"
              @remove-pending="(pendingId) => emit('remove-pending', activity.id, pendingId)"
              @mark-delete="(docId) => emit('mark-delete', activity.id, docId)"
              @undo-delete="(docId) => emit('undo-delete', activity.id, docId)"
              @open-preview="(path, name, isLocal) => emit('open-preview', path, name, isLocal)"
              @save="emit('save', activity)"
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  </div>
</template>
