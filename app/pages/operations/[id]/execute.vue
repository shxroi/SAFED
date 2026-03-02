<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  Download,
  FileText,
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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useAuth } from "~/composables/Auth";
import { useOperationAccess } from "~/composables/operation/useOperationAccess";
import { useExecutionDocumentation } from "~/composables/operation/useExecutionDocumentation";
import { useOperationDetail } from "~/composables/operation/useOperationDetail";
import { useOperationFormatters } from "~/composables/operation/useOperationFormatters";
import { useOperationProgress } from "~/composables/operation/useOperationProgress";
import { useOperationSave } from "~/composables/operation/useOperationSave";

const MAX_DOCS_PER_TASK = 2;

const route = useRoute();
const { user } = useAuth();

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

  if (!activity.documentationRequired) {
    toast.error("Documentation is not required for this task");
    return;
  }

  const remainingSlots = getRemainingDocumentationSlots(activity);
  if (remainingSlots <= 0) {
    toast.error(`Maximum ${MAX_DOCS_PER_TASK} photos allowed per task`);
    return;
  }

  const { addedCount, skippedCount, skippedNonImage } = addPendingDocumentation(
    activity,
    files,
  );

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

const canOpenReportPage = computed(
  () => isSupervisor.value || Boolean(operation.value?.reportPdfPath),
);

const reportPrimaryLabel = computed(() => {
  if (isSupervisor.value && !operation.value?.reportPdfPath) {
    return "Field Report";
  }
  return "Review";
});

const goBack = async (): Promise<void> => {
  await navigateTo("/operations");
};

const openReportPage = async (): Promise<void> => {
  if (isSupervisor.value && !operation.value?.reportPdfPath) {
    await navigateTo(`/operations/${operationId.value}/report`);
    return;
  }

  const path = operation.value?.reportPdfPath;
  if (!path) {
    toast.error("Field report is not generated yet");
    return;
  }
  window.open(path, "_blank", "noopener,noreferrer");
};

const openReportPdf = (): void => {
  const path = operation.value?.reportPdfPath;
  if (!path) {
    toast.error("Field report is not generated yet");
    return;
  }
  const link = document.createElement("a");
  link.href = path;
  link.download = `field-report-${operationId.value}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
  <div class="min-h-screen bg-gray-50 pb-36 md:pb-24">
    <div class="px-4 md:px-6 lg:px-8 mt-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <Button variant="ghost" size="icon" @click="goBack">
            <ArrowLeft class="h-5 w-5" />
          </Button>
          <div>
            <h1 class="text-xl font-semibold text-gray-900">
              Execute Operation
            </h1>
            <p class="text-sm text-gray-600">{{ operationTitle }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Badge variant="secondary" class="bg-green-300">{{ operation?.status || "-" }}</Badge>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div
        class="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"
      ></div>
    </div>

    <div
      v-else-if="operation && !isReadOnly"
      class="mx-auto max-w-7xl px-4 pt-2 pb-8 sm:px-6 md:pt-3 lg:px-8"
    >
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
            class="flex gap-3 border-b border-gray-200 p-4 flex-row items-center justify-between"
          >
            <h3 class="font-semibold text-gray-900">Checklist</h3>
            <div
              class="grid w-fit grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1"
            >
              <Button
                variant="ghost"
                size="sm"
                :class="[
                  'h-7 px-3 text-xs rounded-md',
                  activeTab === 'tools'
                    ? 'bg-white shadow-sm font-medium'
                    : 'text-gray-500',
                ]"
                aria-label="Open tools checklist"
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
                aria-label="Open operation checklist"
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
                  setActivityStatus(
                    sectionIndex,
                    moduleIndex,
                    activityIndex,
                    status,
                  )
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

          <div
            v-if="isSupervisor"
            class="border-t border-gray-200 pt-4 pr-4 flex justify-end"
          >
            <Button
              class="h-10 px-6 bg-gray-200 text-slate hover:bg-gray-100"
              :disabled="operation.status === 'Complete'"
              @click="showFinishDialog = true"
            >
              Finish Operation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <div
      v-else-if="operation && isReadOnly"
      class="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"
    >
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start lg:gap-6">
        <div class="lg:col-span-3">
          <Card class="border border-gray-200 shadow-sm">
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-semibold text-gray-900">Report</CardTitle>
            </CardHeader>
            <CardContent class="space-y-2 pt-0">
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-md border border-gray-200 bg-slate-100 px-2.5 py-2 text-left text-xs text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="!canOpenReportPage"
                @click="openReportPage"
              >
                <FileText class="h-3.5 w-3.5 shrink-0" />
                <span class="min-w-0 flex-1 truncate"
                  >{{ operation.type }} - {{ operationTitle }}</span
                >
                <Download class="h-3.5 w-3.5 shrink-0" />
              </button>
            </CardContent>
            <CardFooter class="grid grid-cols-2 gap-1.5 pt-0">
              <Button
                variant="outline"
                size="sm"
                class="h-8 w-full bg-gray-100 text-xs font-semibold hover:bg-gray-200"
                :disabled="!canOpenReportPage"
                @click="openReportPage"
              >
                {{ reportPrimaryLabel }}
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="h-8 w-full gap-1.5 text-xs font-semibold"
                :disabled="!operation.reportPdfPath"
                @click="openReportPdf"
              >
                <Download class="h-3.5 w-3.5" />
                Download
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div class="lg:col-span-9">
          <Card class="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle class="text-base font-semibold"
                >{{ operation.type }} - {{ operationTitle }}</CardTitle
              >
            </CardHeader>
            <CardContent class="pt-0">
              <div class="mb-2 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6">
                <div class="space-y-2.5 text-sm">
                  <div class="flex items-center gap-2">
                    <MapPin class="h-4 w-4 text-gray-400" />
                    <span
                      >{{ operation.location }},
                      {{ formatDate(operation.date) }}</span
                    >
                  </div>
                  <div class="flex items-center gap-2">
                    <Building2 class="h-4 w-4 text-gray-400" />
                    <span>{{ operation.company }}</span>
                  </div>
                </div>
                <div class="space-y-2.5 text-sm">
                  <div class="flex items-center gap-2">
                    <Users class="h-4 w-4 text-gray-400" />
                    <span>{{ operation.supervisorName }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <Users class="h-4 w-4 text-gray-400" />
                    <span>{{ operation.staffNames?.join(", ") }}</span>
                  </div>
                </div>
              </div>

              <div class="space-y-1.5">
                <div class="flex justify-between text-sm font-semibold">
                  <span>Progress</span>
                  <span>{{ calculateProgress }}%</span>
                </div>
                <Progress
                  :model-value="calculateProgress"
                  class="h-1.5 bg-slate-100"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div class="col-span-full">
          <div
            class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <h2 class="text-xl font-bold">Checklist</h2>
            <div class="inline-flex w-fit rounded-lg bg-gray-100 p-1">
              <Button
                variant="ghost"
                size="sm"
                :class="[
                  'text-xs rounded-md hover:bg-white',
                  monitorTab === 'tools'
                    ? 'bg-white shadow-sm font-medium'
                    : 'text-gray-500 hover:bg-gray-50',
                ]"
                aria-label="Show tools checklist"
                @click="monitorTab = 'tools'"
              >
                Tools
              </Button>
              <Button
                variant="ghost"
                size="sm"
                :class="[
                  'text-xs rounded-md hover:bg-white',
                  monitorTab === 'operation'
                    ? 'bg-white shadow-sm font-medium'
                    : 'text-gray-500 hover:bg-gray-50',
                ]"
                aria-label="Show operation checklist"
                @click="monitorTab = 'operation'"
              >
                Operation
              </Button>
            </div>
          </div>

          <div
            v-if="monitorTab === 'operation'"
            class="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6"
          >
            <div class="space-y-2 lg:col-span-3">
              <button
                v-for="section in sections"
                :key="section.id"
                type="button"
                :class="[
                  'w-full rounded-lg p-3 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-slate-800',
                  selectedSectionId === section.id
                    ? 'bg-white text-slate-900 border border-slate-200'
                    : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50',
                ]"
                :aria-pressed="selectedSectionId === section.id"
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
              </button>
            </div>

            <div class="lg:col-span-9">
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
            {{ finishing ? "Finishing…" : "Finish" }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
