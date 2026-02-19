<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  Download,
  MapPin,
  Users,
} from "lucide-vue-next";
import { toast } from "vue-sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type { OperationActivity } from "../../../../shared/types/operation-execution";
import OperationActivityCard from "~/components/operation/checklist/OperationActivityCard.vue";
import OperationSectionsChecklist from "~/components/operation/checklist/OperationSectionsChecklist.vue";
import ToolsChecklistPanel from "~/components/operation/checklist/ToolsChecklistPanel.vue";
import OperationInfoCard from "~/components/operation/OperationInfoCard.vue";
import { useOperationAccess } from "~/composables/operation/useOperationAccess";
import { useExecutionDocumentation } from "~/composables/operation/useExecutionDocumentation";
import { useOperationDetail } from "~/composables/operation/useOperationDetail";
import { useOperationFormatters } from "~/composables/operation/useOperationFormatters";
import { useOperationProgress } from "~/composables/operation/useOperationProgress";
import { useOperationSave } from "~/composables/operation/useOperationSave";

const MAX_DOCS_PER_TASK = 2;

const route = useRoute();
const { user } = useUserSession();

const operationId = computed(() => Number(route.params.id));

const { operation, tools, sections, loading, error, fetchOperationDetail } =
  useOperationDetail(operationId);
const { canAccess, isReadOnly, isSupervisor } = useOperationAccess(
  operation,
  user,
);
const { progress: calculateProgress } = useOperationProgress(tools, sections);
const { formatDate, getDaysLeft } = useOperationFormatters();

const showFinishDialog = ref(false);
const activeTab = ref<"tools" | "operation">("tools");
const monitorTab = ref<"tools" | "operation">("operation");
const selectedSectionId = ref<number | null>(null);

const {
  previewOpen,
  previewImagePath,
  previewImageName,
  previewImageIsLocal,
  pendingDocumentationByTask,
  deletedDocumentationByTask,
  getDeletedDocumentationIds,
  getVisibleUploadedDocs,
  getPendingDocumentation,
  getRemainingDocumentationSlots,
  clearTaskDocumentationDraft,
  clearAllDocumentationDrafts,
  openImagePreview,
  removePendingDocumentation,
  markDocumentationForDelete,
  undoDocumentationDelete,
  addPendingDocumentation,
} = useExecutionDocumentation(MAX_DOCS_PER_TASK);

const {
  saving,
  finishing,
  uploadingByTask,
  isTaskUploading,
  setToolCondition,
  updateToolNote,
  setActivityStatus,
  saveTools,
  saveActivity,
  finishOperation,
} = useOperationSave({
  operationId,
  tools,
  sections,
  isReadOnly,
  pendingDocumentationByTask,
  deletedDocumentationByTask,
  undoDocumentationDelete,
  removePendingDocumentation,
  clearTaskDocumentationDraft,
  fetchOperationDetail,
});

const selectedSection = computed(() => {
  return sections.value.find(
    (section) => section.id === selectedSectionId.value,
  );
});

watch(
  () => sections.value,
  (nextSections) => {
    if (!selectedSectionId.value && nextSections.length > 0) {
      selectedSectionId.value = nextSections[0]?.id ?? null;
    }
  },
  { deep: true, immediate: true },
);

onBeforeUnmount(() => {
  clearAllDocumentationDrafts();
});

const handleDocumentationFiles = async (
  activity: OperationActivity,
  files: File[],
): Promise<void> => {
  if (
    isReadOnly.value ||
    Number.isNaN(operationId.value) ||
    operationId.value < 1
  )
    return;

  if (files.length === 0) return;

  const remainingSlots = getRemainingDocumentationSlots(activity);
  if (remainingSlots <= 0) {
    toast.error(`Maximum ${MAX_DOCS_PER_TASK} photos allowed per task`);
    return;
  }

  const { addedCount, skippedCount, skippedNonImage } =
    addPendingDocumentation(activity, files);

  if (addedCount === 0) {
    toast.error("Please select image files");
    return;
  }

  if (skippedNonImage) {
    toast.warning("Only image files were added");
  }

  if (skippedCount > 0) {
    toast.warning(`Only ${remainingSlots} photo(s) added due to task limit`);
  }
};

const operationDaysLeft = computed(() => {
  if (!operation.value?.date) return null;
  return getDaysLeft(operation.value.date);
});

const operationTitle = computed(() => {
  if (!operation.value) return "Operation";
  return operation.value.vesselName || operation.value.company;
});

const goBack = async (): Promise<void> => {
  await navigateTo("/operations");
};

onMounted(async () => {
  if (Number.isNaN(operationId.value) || operationId.value < 1) {
    toast.error("Invalid operation ID");
    await navigateTo("/operations");
    return;
  }

  try {
    await fetchOperationDetail();

    if (!canAccess.value) {
      toast.error("You are not authorized to access this operation");
      await navigateTo("/operations");
      return;
    }
  } catch {
    toast.error(error.value || "Failed to load operation");
    await navigateTo("/operations");
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-48">
    <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div class="px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              @click="goBack"
              v-if="!isReadOnly"
            >
              <ArrowLeft class="h-5 w-5" />
            </Button>
            <div v-else class="flex items-center gap-2">
              <span class="font-bold text-lg">Manage Operations</span>
            </div>
            <h1 class="text-lg font-semibold text-gray-900" v-if="!isReadOnly">
              Operations
            </h1>
            <Badge v-if="isReadOnly" variant="secondary" class="gap-1 ml-2">
              {{ (user as any)?.username || "User" }}
            </Badge>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div
        class="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"
      ></div>
    </div>

    <div v-else-if="operation && !isReadOnly" class="p-4">
      <OperationInfoCard
        :operation="operation"
        :progress="calculateProgress"
        :days-left="operationDaysLeft"
        :formatted-date="formatDate(operation.date)"
        class="mb-6"
      />

      <Card class="border border-gray-200 shadow-sm mb-6">
        <CardContent class="p-0">
          <div
            class="p-4 border-b border-gray-200 flex justify-between items-center"
          >
            <h3 class="font-semibold text-gray-900">Checklist</h3>
            <div class="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                :class="[
                  'h-7 px-3 text-xs rounded-md',
                  activeTab === 'tools'
                    ? 'bg-white shadow-sm font-medium'
                    : 'text-gray-500',
                ]"
                @click="activeTab = 'tools'"
              >
                Tools
              </Button>
              <Button
                variant="ghost"
                size="sm"
                :class="[
                  'h-7 px-3 text-xs rounded-md',
                  activeTab === 'operation'
                    ? 'bg-white shadow-sm font-medium'
                    : 'text-gray-500',
                ]"
                @click="activeTab = 'operation'"
              >
                Operation
              </Button>
            </div>
          </div>

          <div v-if="activeTab === 'tools'" class="p-4">
            <ToolsChecklistPanel
              :tools="tools"
              :editable="!isReadOnly"
              :saving="saving"
              @set-condition="setToolCondition"
              @update-note="updateToolNote"
              @save="saveTools"
            />
          </div>

          <div v-if="activeTab === 'operation'" class="p-4 space-y-4">
            <OperationSectionsChecklist
              :sections="sections"
              :editable="!isReadOnly"
              :max-docs-per-task="MAX_DOCS_PER_TASK"
              :pending-by-task="pendingDocumentationByTask"
              :deleted-by-task="deletedDocumentationByTask"
              :uploading-by-task="uploadingByTask"
              @set-status="
                (sectionIndex, moduleIndex, activityIndex, status) =>
                  setActivityStatus(sectionIndex, moduleIndex, activityIndex, status)
              "
              @update-notes="(activity, value) => (activity.notes = value)"
              @add-documentation="
                (activity, files) => handleDocumentationFiles(activity, files)
              "
              @remove-pending="
                (activityId, pendingId) =>
                  removePendingDocumentation(activityId, pendingId)
              "
              @mark-delete="
                (activityId, docId) =>
                  markDocumentationForDelete(activityId, docId)
              "
              @undo-delete="
                (activityId, docId) =>
                  undoDocumentationDelete(activityId, docId)
              "
              @open-preview="
                (path, name, isLocal) =>
                  openImagePreview(path, name, Boolean(isLocal))
              "
              @save="(activity) => saveActivity(activity)"
            />
          </div>
        </CardContent>
      </Card>

      <div
        class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50"
      >
        <Button
          v-if="isSupervisor"
          variant="outline"
          class="w-full border-slate-900 text-slate-900 hover:bg-slate-50 h-12"
          :disabled="operation.status === 'Complete'"
          @click="showFinishDialog = true"
        >
          Finished Operation
        </Button>
      </div>
    </div>

    <div v-else-if="operation && isReadOnly" class="p-8 max-w-7xl mx-auto">
      <div class="grid grid-cols-12 gap-8">
        <div class="col-span-12">
          <Card class="mb-6">
            <CardHeader class="flex flex-row items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="p-2 bg-gray-100 rounded-lg">
                  <Download class="w-5 h-5 text-gray-600" />
                </div>
                <CardTitle class="text-base font-medium"
                  >{{ operation.type }} - {{ operationTitle }}</CardTitle
                >
              </div>
              <Download
                class="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600"
              />
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-2 gap-8 mb-6">
                <div class="space-y-3 text-sm">
                  <div class="flex gap-2">
                    <MapPin class="w-4 h-4 text-gray-400" />
                    <span
                      >{{ operation.location }},
                      {{ formatDate(operation.date) }}</span
                    >
                  </div>
                  <div class="flex gap-2">
                    <Building2 class="w-4 h-4 text-gray-400" />
                    <span>{{ operation.company }}</span>
                  </div>
                </div>
                <div class="space-y-3 text-sm">
                  <div class="flex gap-2">
                    <Users class="w-4 h-4 text-gray-400" />
                    <span>{{ operation.supervisorName }}</span>
                  </div>
                  <div class="flex gap-2">
                    <Users class="w-4 h-4 text-gray-400" />
                    <span>{{ operation.staffNames?.join(", ") }}</span>
                  </div>
                </div>
              </div>

              <div class="space-y-2">
                <div class="flex justify-between text-sm font-medium">
                  <span>Progress</span>
                  <span>{{ calculateProgress }}%</span>
                </div>
                <Progress
                  :model-value="calculateProgress"
                  class="h-2 bg-slate-100"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div class="col-span-12">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">Checklist</h2>
            <div class="bg-gray-100 p-1 rounded-lg inline-flex">
              <Button
                variant="ghost"
                size="sm"
                :class="[
                  'text-xs rounded-md',
                  monitorTab === 'operation'
                    ? 'bg-white shadow-sm font-medium'
                    : 'text-gray-500',
                ]"
                @click="monitorTab = 'operation'"
              >
                Operation
              </Button>
              <Button
                variant="ghost"
                size="sm"
                :class="[
                  'text-xs rounded-md',
                  monitorTab === 'tools'
                    ? 'bg-white shadow-sm font-medium'
                    : 'text-gray-500',
                ]"
                @click="monitorTab = 'tools'"
              >
                Tools
              </Button>
            </div>
          </div>

          <div
            v-if="monitorTab === 'operation'"
            class="grid grid-cols-12 gap-6"
          >
            <div class="col-span-3 space-y-2">
              <div
                v-for="section in sections"
                :key="section.id"
                :class="[
                  'p-3 rounded-lg cursor-pointer text-sm font-medium transition-colors',
                  selectedSectionId === section.id
                    ? 'bg-slate-100 text-slate-900 border border-slate-200'
                    : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50',
                ]"
                @click="selectedSectionId = section.id"
              >
                <div class="flex justify-between items-center">
                  {{ section.name }}
                  <ChevronDown
                    v-if="selectedSectionId !== section.id"
                    class="w-4 h-4 text-gray-400 -rotate-90"
                  />
                  <ChevronDown v-else class="w-4 h-4 text-gray-900" />
                </div>
              </div>
            </div>

            <div class="col-span-9">
              <Card v-if="selectedSection">
                <CardHeader>
                  <CardTitle class="text-lg">{{
                    selectedSection.name
                  }}</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                  <div
                    v-for="module in selectedSection.modules"
                    :key="module.id"
                  >
                    <div
                      v-if="module.activities.length === 0"
                      class="text-center py-8 text-gray-400 italic"
                    >
                      No activities here
                    </div>
                    <div
                      v-for="activity in module.activities"
                      :key="activity.id"
                    >
                      <OperationActivityCard
                        :activity="activity"
                        :max-docs-per-task="MAX_DOCS_PER_TASK"
                        :visible-docs="activity.documentations || []"
                        :pending-docs="[]"
                        :deleted-docs="[]"
                        :remaining-slots="0"
                        @open-preview="
                          (path, name, isLocal) =>
                            openImagePreview(path, name, Boolean(isLocal))
                        "
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div v-if="monitorTab === 'tools'" class="col-span-12">
            <ToolsChecklistPanel :tools="tools" />
          </div>
        </div>
      </div>
    </div>

    <Dialog v-model:open="previewOpen">
      <DialogContent class="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{{ previewImageName }}</DialogTitle>
        </DialogHeader>
        <div
          class="w-full overflow-hidden rounded border border-gray-200 bg-black/5"
        >
          <img
            v-if="previewImageIsLocal"
            :src="previewImagePath"
            :alt="previewImageName"
            class="w-full h-auto object-contain"
          />
          <NuxtImg
            v-else
            :src="previewImagePath"
            :alt="previewImageName"
            width="1280"
            height="960"
            format="webp"
            loading="eager"
            class="w-full h-auto object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog v-model:open="showFinishDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Finish Operation?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to mark this operation as completed? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="finishing">Cancel</AlertDialogCancel>
          <AlertDialogAction :disabled="finishing" @click="finishOperation">
            {{ finishing ? "Finishing..." : "Finish" }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
