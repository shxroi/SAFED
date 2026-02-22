<script lang="ts" setup>
import { Plus, Trash2 } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ChecklistSectionInput } from "@/composables/operation/useChecklistBuilder";

const props = defineProps<{
  sectionsList: ChecklistSectionInput[];
  selectedSection: number;
  submitting: boolean;
}>();

const emit = defineEmits<{
  "add-module": [sectionIndex: number];
  "remove-module": [sectionIndex: number, moduleIndex: number];
  "add-activity": [sectionIndex: number, moduleIndex: number];
  "remove-activity": [
    sectionIndex: number,
    moduleIndex: number,
    activityIndex: number,
  ];
  save: [];
}>();

const currentSection = computed(
  () => props.sectionsList[props.selectedSection],
);
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      
      <Label class="text-xl font-medium text-gray-900">Section</Label>
      <Input
        :model-value="currentSection?.name ?? ''"
        placeholder="Section name"
        class="bg-gray-50 border-gray-200"
        @update:model-value="
          (val) => {
            if (currentSection) currentSection.name = String(val);
          }
        "
      />
    </div>

    <div class="space-y-6">
      <Label class="text-sm font-medium text-gray-900">Activities</Label>

      <div class="space-y-8">
        <div
          v-for="(module, moduleIndex) in currentSection?.modules || []"
          :key="moduleIndex"
          class="space-y-4"
        >
          <div
            v-if="(currentSection?.modules.length || 0) > 1"
            class="flex items-center justify-between"
          >
            <h4 class="text-sm font-medium text-gray-500">
              {{ module.name || `Module ${moduleIndex + 1}` }}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              class="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
              @click="emit('remove-module', props.selectedSection, moduleIndex)"
            >
              <Trash2 class="h-4 w-4 mr-2" />
              Delete Module
            </Button>
          </div>

          <div class="space-y-4">
            <div
              v-for="(activity, activityIndex) in module.activities"
              :key="activityIndex"
              class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-4"
            >
              <Textarea
                v-model="activity.description"
                placeholder="Enter activity description"
                class="min-h-[80px] bg-white border-gray-200 resize-none focus-visible:ring-offset-0 focus-visible:ring-1"
              />
              <div class="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex items-center space-x-3">
                  <Switch
                    :id="`switch-${props.selectedSection}-${moduleIndex}-${activityIndex}`"
                    v-model:model-value="activity.documentationRequired"
                  />
                  <Label
                    :for="`switch-${props.selectedSection}-${moduleIndex}-${activityIndex}`"
                    class="text-sm text-gray-700 cursor-pointer font-normal"
                  >
                    Documentation required
                  </Label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  class="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2 font-medium"
                  :aria-label="`Delete activity ${activityIndex + 1}`"
                  @click="
                    emit(
                      'remove-activity',
                      props.selectedSection,
                      moduleIndex,
                      activityIndex,
                    )
                  "
                >
                  <Trash2 class="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              class="w-full justify-between text-gray-500 bg-white border-gray-200 hover:bg-gray-50 h-11"
              @click="emit('add-activity', props.selectedSection, moduleIndex)"
            >
              <span>Add new activity</span>
              <Plus class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          v-if="(currentSection?.modules.length || 0) === 0"
          class="text-center py-8"
        >
          <Button
            variant="outline"
            @click="emit('add-module', props.selectedSection)"
          >
            Add Module for Activities
          </Button>
        </div>
      </div>
    </div>

    <div class="mt-4 flex justify-end border-t border-gray-100/50 pt-4">
      <Button
        :disabled="props.submitting"
        class="h-11 w-full bg-slate-900 px-8 text-white hover:bg-slate-800 sm:h-9 sm:w-auto"
        @click="emit('save')"
      >
        {{ props.submitting ? "Saving..." : "Save" }}
      </Button>
    </div>
  </div>
</template>
