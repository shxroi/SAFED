<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Download,
  ImagePlus,
  MapPin,
  Users,
  X,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type {
  OperationStatus,
  OperationType,
} from "../../../../shared/types/operation";
import type { OperationActivity } from "../../../../shared/types/operation-execution";
import { useOperationAccess } from "~/composables/operation/useOperationAccess";
import { useOperationDetail } from "~/composables/operation/useOperationDetail";
import { useOperationProgress } from "~/composables/operation/useOperationProgress";

interface PendingDocumentation {
  id: string;
  file: File;
  previewUrl: string;
}

const MAX_DOCS_PER_TASK = 2;

const route = useRoute();
const { user } = useUserSession();

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof (error as { data?: { message?: unknown } }).data?.message ===
      "string"
  ) {
    return (error as { data: { message: string } }).data.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallbackMessage;
};

const operationId = computed(() => Number(route.params.id));

const { operation, tools, sections, loading, error, fetchOperationDetail } =
  useOperationDetail(operationId);
const { canAccess, isReadOnly, isSupervisor } = useOperationAccess(
  operation,
  user,
);
const { progress: calculateProgress } = useOperationProgress(tools, sections);

const saving = ref(false);
const finishing = ref(false);
const showFinishDialog = ref(false);
const activeTab = ref<"tools" | "operation">("tools");
const monitorTab = ref<"tools" | "operation">("operation");
const selectedSectionId = ref<number | null>(null);
const previewOpen = ref(false);
const previewImagePath = ref("");
const previewImageName = ref("Documentation image");
const previewImageIsLocal = ref(false);
const uploadingByTask = ref<Record<number, boolean>>({});
const pendingDocumentationByTask = ref<Record<number, PendingDocumentation[]>>(
  {},
);
const deletedDocumentationByTask = ref<Record<number, number[]>>({});

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
  for (const taskId of Object.keys(pendingDocumentationByTask.value)) {
    const numericTaskId = Number(taskId);
    if (!Number.isNaN(numericTaskId)) {
      clearTaskDocumentationDraft(numericTaskId);
    }
  }
});

const setToolCondition = (
  toolIndex: number,
  type: "pre" | "post",
  status: "Good" | "Not Good",
) => {
  if (isReadOnly.value) return;

  const tool = tools.value[toolIndex];
  if (!tool) return;

  if (type === "pre") {
    tool.preStatus = status;
    return;
  }

  tool.postStatus = status;
};

const setActivityStatus = (
  sectionIndex: number,
  moduleIndex: number,
  activityIndex: number,
  status: "Good" | "Not Good",
) => {
  if (isReadOnly.value) return;

  const section = sections.value[sectionIndex];
  const module = section?.modules[moduleIndex];
  const activity = module?.activities[activityIndex];

  if (activity) {
    activity.status = status;
  }
};

const saveTools = async (): Promise<void> => {
  if (
    isReadOnly.value ||
    Number.isNaN(operationId.value) ||
    operationId.value < 1
  )
    return;

  saving.value = true;

  try {
    await $fetch(`/api/operations/${operationId.value}/tools`, {
      method: "PUT",
      body: {
        tools: tools.value.map((tool) => ({
          id: tool.id,
          preStatus: tool.preStatus,
          postStatus: tool.postStatus,
          preNote: tool.preNote,
          postNote: tool.postNote,
        })),
      },
    });

    toast.success("Tools checklist saved successfully");
    await fetchOperationDetail();
  } catch (err: unknown) {
    toast.error(getErrorMessage(err, "Failed to save tools"));
  } finally {
    saving.value = false;
  }
};

const saveActivity = async (activity: OperationActivity): Promise<void> => {
  if (
    isReadOnly.value ||
    Number.isNaN(operationId.value) ||
    operationId.value < 1
  )
    return;

  const pendingDocs = pendingDocumentationByTask.value[activity.id] || [];
  const deletedDocIds = deletedDocumentationByTask.value[activity.id] || [];

  if (activity.documentationRequired) {
    const currentDocs = (activity.documentations || []).filter(
      (doc) => !deletedDocIds.includes(doc.id),
    );
    if (currentDocs.length + pendingDocs.length === 0) {
      toast.error("Documentation photo is required for this task");
      return;
    }
  }

  saving.value = true;
  uploadingByTask.value[activity.id] = true;

  try {
    await $fetch(`/api/operations/${operationId.value}/tasks/${activity.id}`, {
      method: "PUT",
      body: {
        status: activity.status,
        notes: activity.notes,
      },
    });

    for (const docId of deletedDocIds) {
      await $fetch(
        `/api/operations/${operationId.value}/tasks/${activity.id}/documentation/${docId}`,
        {
          method: "DELETE",
        },
      );
      undoDocumentationDelete(activity.id, docId);
    }

    for (const pendingDoc of pendingDocs) {
      const formData = new FormData();
      formData.append("file", pendingDoc.file);

      await $fetch(
        `/api/operations/${operationId.value}/tasks/${activity.id}/documentation`,
        {
          method: "POST",
          body: formData,
        },
      );

      removePendingDocumentation(activity.id, pendingDoc.id);
    }

    clearTaskDocumentationDraft(activity.id);
    await fetchOperationDetail();

    toast.success("Activity saved successfully");
  } catch (err: unknown) {
    toast.error(getErrorMessage(err, "Failed to save activity"));
  } finally {
    saving.value = false;
    uploadingByTask.value[activity.id] = false;
  }
};

const finishOperation = async (): Promise<void> => {
  if (
    isReadOnly.value ||
    Number.isNaN(operationId.value) ||
    operationId.value < 1
  )
    return;

  finishing.value = true;

  try {
    await $fetch(`/api/operations/${operationId.value}/complete`, {
      method: "POST",
    });

    toast.success("Operation completed successfully");
    showFinishDialog.value = false;
    await navigateTo("/operations");
  } catch (err: unknown) {
    toast.error(getErrorMessage(err, "Failed to finish operation"));
  } finally {
    finishing.value = false;
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getDeletedDocumentationIds = (taskId: number): number[] => {
  return deletedDocumentationByTask.value[taskId] || [];
};

const getVisibleUploadedDocs = (activity: OperationActivity) => {
  const deletedIds = new Set(getDeletedDocumentationIds(activity.id));
  return (activity.documentations || []).filter(
    (doc) => !deletedIds.has(doc.id),
  );
};

const getPendingDocumentation = (taskId: number): PendingDocumentation[] => {
  return pendingDocumentationByTask.value[taskId] || [];
};

const getRemainingDocumentationSlots = (
  activity: OperationActivity,
): number => {
  const used =
    getVisibleUploadedDocs(activity).length +
    getPendingDocumentation(activity.id).length;
  return Math.max(0, MAX_DOCS_PER_TASK - used);
};

const clearTaskDocumentationDraft = (taskId: number): void => {
  const pending = pendingDocumentationByTask.value[taskId] || [];
  for (const item of pending) {
    URL.revokeObjectURL(item.previewUrl);
  }

  pendingDocumentationByTask.value[taskId] = [];
  deletedDocumentationByTask.value[taskId] = [];
};

const isTaskUploading = (taskId: number): boolean => {
  return !!uploadingByTask.value[taskId];
};

const openImagePreview = (path: string, name: string, isLocal = false) => {
  previewImagePath.value = path;
  previewImageName.value = name;
  previewImageIsLocal.value = isLocal;
  previewOpen.value = true;
};

const removePendingDocumentation = (
  taskId: number,
  pendingId: string,
): void => {
  const pending = pendingDocumentationByTask.value[taskId] || [];
  const next = pending.filter((item) => {
    if (item.id !== pendingId) return true;

    URL.revokeObjectURL(item.previewUrl);
    return false;
  });

  pendingDocumentationByTask.value[taskId] = next;
};

const markDocumentationForDelete = (taskId: number, docId: number): void => {
  const current = deletedDocumentationByTask.value[taskId] || [];
  if (!current.includes(docId)) {
    deletedDocumentationByTask.value[taskId] = [...current, docId];
  }
};

const undoDocumentationDelete = (taskId: number, docId: number): void => {
  const current = deletedDocumentationByTask.value[taskId] || [];
  deletedDocumentationByTask.value[taskId] = current.filter(
    (item) => item !== docId,
  );
};

const handleDocumentationSelect = async (
  activity: OperationActivity,
  event: Event,
): Promise<void> => {
  if (
    isReadOnly.value ||
    Number.isNaN(operationId.value) ||
    operationId.value < 1
  )
    return;

  const input = event.target as HTMLInputElement;
  const files = input.files;

  if (!files || files.length === 0) {
    return;
  }

  const remainingSlots = getRemainingDocumentationSlots(activity);
  if (remainingSlots <= 0) {
    toast.error(`Maximum ${MAX_DOCS_PER_TASK} photos allowed per task`);
    input.value = "";
    return;
  }

  try {
    const selectedFiles = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, remainingSlots);

    if (selectedFiles.length === 0) {
      toast.error("Please select image files");
      return;
    }

    if (selectedFiles.length < files.length) {
      toast.warning(`Only ${remainingSlots} photo(s) added due to task limit`);
    }

    const current = pendingDocumentationByTask.value[activity.id] || [];
    const next = [...current];

    for (const file of selectedFiles) {
      next.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    pendingDocumentationByTask.value[activity.id] = next;
  } catch (err: unknown) {
    toast.error(getErrorMessage(err, "Failed to add selected images"));
  } finally {
    input.value = "";
  }
};

const getDaysLeft = (dateString: string): number | null => {
  const operationDate = new Date(dateString);

  if (Number.isNaN(operationDate.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  operationDate.setHours(0, 0, 0, 0);

  return Math.ceil(
    (operationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
};

const operationDaysLeft = computed(() => {
  if (!operation.value?.date) return null;
  return getDaysLeft(operation.value.date);
});

const operationTitle = computed(() => {
  if (!operation.value) return "Operation";
  return operation.value.vesselName || operation.value.company;
});

const getStatusColor = (status: OperationStatus): string => {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-700 border-green-200";
    case "Draft":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "Complete":
      return "bg-gray-100 text-gray-700 border-gray-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

const getTypeColor = (type: OperationType): string => {
  const typeMap: Record<OperationType, string> = {
    Installation: "bg-purple-100 text-purple-700 border-purple-200",
    Maintenance: "bg-orange-100 text-orange-700 border-orange-200",
    "SAT/Commissioning": "bg-blue-100 text-blue-700 border-blue-200",
    Upgrade: "bg-teal-100 text-teal-700 border-teal-200",
    Uninstall: "bg-red-100 text-red-700 border-red-200",
  };

  return typeMap[type];
};

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
              {{ user?.username || "User" }}
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
      <Card class="border border-gray-200 shadow-sm mb-6">
        <CardContent class="p-4">
          <div class="mb-4">
            <h2 class="font-semibold text-lg text-gray-900 mb-2">
              {{ operationTitle }}
            </h2>
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
              <span>{{ formatDate(operation.date) }}</span>
              <span
                v-if="operationDaysLeft !== null"
                class="ml-auto text-xs text-gray-400"
              >
                {{ operationDaysLeft }} days left
              </span>
            </div>
            <div class="flex items-center gap-2">
              <Building2 class="h-4 w-4 text-gray-400 shrink-0" />
              <span>{{ operation.company }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Users class="h-4 w-4 text-gray-400 shrink-0" />
              <span>{{
                operation.staffNames?.join(", ") || "No staff assigned"
              }}</span>
            </div>
          </div>

          <div class="space-y-2 mb-4">
            <div class="flex justify-between text-sm font-medium">
              <span>Progress</span>
              <span>{{ calculateProgress }}%</span>
            </div>
            <Progress :model-value="calculateProgress" class="h-2" />
          </div>

          <div class="pt-3 border-t border-gray-100">
            <p class="text-sm text-gray-600">
              Supervisor:
              <span class="font-medium text-gray-900">{{
                operation.supervisorName
              }}</span>
            </p>
          </div>
        </CardContent>
      </Card>

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

          <div v-if="activeTab === 'tools'" class="p-4 space-y-4">
            <div
              v-for="(tool, toolIndex) in tools"
              :key="tool.id"
              class="bg-slate-50 border border-gray-200 rounded-lg p-4"
            >
              <div class="flex items-center justify-between mb-4">
                <h4 class="font-medium text-gray-900">{{ tool.name }}</h4>
                <span class="text-sm font-medium"
                  >QTY : {{ tool.quantity }}</span
                >
              </div>

              <div class="space-y-3 mb-4 border-b border-gray-200 pb-4">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Pre condition</span>
                  <div class="flex gap-2" v-if="!tool.preStatus">
                    <Button
                      size="sm"
                      class="bg-green-300 hover:bg-green-400 text-green-800 w-12 h-8"
                      @click="setToolCondition(toolIndex, 'pre', 'Good')"
                    >
                      <Check class="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      class="bg-red-300 hover:bg-red-400 text-red-800 w-12 h-8"
                      @click="setToolCondition(toolIndex, 'pre', 'Not Good')"
                    >
                      <X class="w-4 h-4" />
                    </Button>
                  </div>
                  <Badge
                    v-else
                    :class="
                      tool.preStatus === 'Good'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    "
                  >
                    {{ tool.preStatus }}
                  </Badge>
                </div>
                <Textarea
                  v-if="tool.preStatus === 'Not Good'"
                  v-model="tool.preNote"
                  placeholder="Type tool note here"
                  class="bg-white"
                />
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Post condition</span>
                  <div class="flex gap-2" v-if="!tool.postStatus">
                    <Button
                      size="sm"
                      class="bg-green-300 hover:bg-green-400 text-green-800 w-12 h-8"
                      @click="setToolCondition(toolIndex, 'post', 'Good')"
                    >
                      <Check class="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      class="bg-red-300 hover:bg-red-400 text-red-800 w-12 h-8"
                      @click="setToolCondition(toolIndex, 'post', 'Not Good')"
                    >
                      <X class="w-4 h-4" />
                    </Button>
                  </div>
                  <Badge
                    v-else
                    :class="
                      tool.postStatus === 'Good'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    "
                  >
                    {{ tool.postStatus }}
                  </Badge>
                </div>
                <Textarea
                  v-if="tool.postStatus === 'Not Good'"
                  v-model="tool.postNote"
                  placeholder="Type post-condition note"
                  class="bg-white"
                />
              </div>

              <Button
                class="w-full mt-4 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200"
                @click="saveTools"
              >
                Save
              </Button>
            </div>
          </div>

          <div v-if="activeTab === 'operation'" class="p-4 space-y-4">
            <Collapsible
              v-for="(section, sectionIndex) in sections"
              :key="section.id"
              v-model:open="section.isOpen"
            >
              <CollapsibleTrigger as-child>
                <Button
                  variant="ghost"
                  class="w-full justify-between p-4 h-auto bg-slate-50 border border-gray-200 rounded-lg hover:bg-slate-100 mb-2"
                >
                  <span class="font-medium text-gray-900">{{
                    section.name
                  }}</span>
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
                    class="bg-white border border-gray-200 rounded-lg p-4 mb-3"
                  >
                    <p class="text-sm text-gray-900 mb-4">
                      {{ activity.jobDescription }}
                    </p>
                    <div class="flex items-center justify-between mb-4">
                      <span class="text-sm font-medium text-gray-700"
                        >Condition</span
                      >
                      <div class="flex gap-2" v-if="!activity.status">
                        <Button
                          size="sm"
                          class="bg-green-300 hover:bg-green-400 text-green-800 w-12 h-8"
                          @click="
                            setActivityStatus(
                              sectionIndex,
                              moduleIndex,
                              activityIndex,
                              'Good',
                            )
                          "
                        >
                          <Check class="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          class="bg-red-300 hover:bg-red-400 text-red-800 w-12 h-8"
                          @click="
                            setActivityStatus(
                              sectionIndex,
                              moduleIndex,
                              activityIndex,
                              'Not Good',
                            )
                          "
                        >
                          <X class="w-4 h-4" />
                        </Button>
                      </div>
                      <Badge
                        v-else
                        :class="
                          activity.status === 'Good'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        "
                      >
                        {{ activity.status }}
                      </Badge>
                    </div>

                    <div class="mb-3 space-y-3">
                      <div class="flex items-center justify-between">
                        <Badge
                          v-if="activity.documentationRequired"
                          class="bg-amber-100 text-amber-800 border border-amber-200"
                        >
                          Documentation Required
                        </Badge>
                        <span v-else class="text-xs text-gray-500"
                          >Documentation optional</span
                        >
                        <span class="text-xs text-gray-500"
                          >Max {{ MAX_DOCS_PER_TASK }} photos</span
                        >
                      </div>

                      <div class="flex flex-wrap items-center gap-2">
                        <label
                          :for="`doc-camera-${activity.id}`"
                          class="inline-flex"
                        >
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            :disabled="
                              isTaskUploading(activity.id) ||
                              getRemainingDocumentationSlots(activity) === 0
                            "
                            class="gap-2"
                          >
                            <ImagePlus class="h-4 w-4" />
                            Camera
                          </Button>
                        </label>
                        <input
                          :id="`doc-camera-${activity.id}`"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          class="hidden"
                          @change="
                            (event) =>
                              handleDocumentationSelect(activity, event)
                          "
                        />

                        <label
                          :for="`doc-gallery-${activity.id}`"
                          class="inline-flex"
                        >
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            :disabled="
                              isTaskUploading(activity.id) ||
                              getRemainingDocumentationSlots(activity) === 0
                            "
                            class="gap-2"
                          >
                            <ImagePlus class="h-4 w-4" />
                            Gallery
                          </Button>
                        </label>
                        <input
                          :id="`doc-gallery-${activity.id}`"
                          type="file"
                          accept="image/*"
                          multiple
                          class="hidden"
                          @change="
                            (event) =>
                              handleDocumentationSelect(activity, event)
                          "
                        />
                      </div>
                    </div>

                    <Textarea
                      v-model="activity.notes"
                      placeholder="Type activity note"
                      class="mb-4 bg-gray-50"
                    />

                    <div
                      v-if="getVisibleUploadedDocs(activity).length > 0"
                      class="mb-4"
                    >
                      <p class="text-xs font-medium text-gray-500 mb-2">
                        Uploaded Photos
                      </p>
                      <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <button
                          v-for="doc in getVisibleUploadedDocs(activity)"
                          :key="doc.id"
                          type="button"
                          class="relative rounded border border-gray-200 overflow-hidden hover:opacity-90"
                          @click="openImagePreview(doc.filePath, doc.fileName)"
                        >
                          <NuxtImg
                            :src="doc.filePath"
                            alt="Documentation preview"
                            width="200"
                            height="140"
                            format="webp"
                            loading="lazy"
                            class="w-full h-24 object-cover"
                          />
                          <span
                            class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate"
                          >
                            {{ doc.fileName }} ({{
                              formatFileSize(doc.fileSize)
                            }})
                          </span>
                        </button>
                      </div>

                      <div class="mt-2 flex flex-wrap gap-2">
                        <Button
                          v-for="doc in getVisibleUploadedDocs(activity)"
                          :key="`mark-delete-${doc.id}`"
                          type="button"
                          variant="ghost"
                          size="sm"
                          class="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                          @click="
                            markDocumentationForDelete(activity.id, doc.id)
                          "
                        >
                          Remove {{ doc.fileName }}
                        </Button>
                      </div>
                    </div>

                    <div
                      v-if="getDeletedDocumentationIds(activity.id).length > 0"
                      class="mb-4 rounded border border-orange-200 bg-orange-50 p-2"
                    >
                      <p class="text-xs font-medium text-orange-700 mb-2">
                        Marked for removal (save to apply)
                      </p>
                      <div class="flex flex-wrap gap-2">
                        <Button
                          v-for="doc in (activity.documentations || []).filter(
                            (item) =>
                              getDeletedDocumentationIds(activity.id).includes(
                                item.id,
                              ),
                          )"
                          :key="`undo-${doc.id}`"
                          type="button"
                          variant="ghost"
                          size="sm"
                          class="h-7 px-2 text-xs"
                          @click="undoDocumentationDelete(activity.id, doc.id)"
                        >
                          Undo {{ doc.fileName }}
                        </Button>
                      </div>
                    </div>

                    <div
                      v-if="getPendingDocumentation(activity.id).length > 0"
                      class="mb-4"
                    >
                      <p class="text-xs font-medium text-gray-500 mb-2">
                        Pending Photos (save to upload)
                      </p>
                      <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <div
                          v-for="pendingDoc in getPendingDocumentation(
                            activity.id,
                          )"
                          :key="pendingDoc.id"
                          class="relative rounded border border-gray-200 overflow-hidden"
                        >
                          <button
                            type="button"
                            class="w-full"
                            @click="
                              openImagePreview(
                                pendingDoc.previewUrl,
                                pendingDoc.file.name,
                                true,
                              )
                            "
                          >
                            <img
                              :src="pendingDoc.previewUrl"
                              :alt="pendingDoc.file.name"
                              class="w-full h-24 object-cover"
                            />
                            <span
                              class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate"
                            >
                              {{ pendingDoc.file.name }} ({{
                                formatFileSize(pendingDoc.file.size)
                              }})
                            </span>
                          </button>
                          <button
                            type="button"
                            class="absolute top-1 right-1 rounded bg-white/90 px-1 text-xs text-red-600"
                            @click="
                              removePendingDocumentation(
                                activity.id,
                                pendingDoc.id,
                              )
                            "
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>

                    <p
                      v-if="
                        activity.documentationRequired &&
                        getVisibleUploadedDocs(activity).length +
                          getPendingDocumentation(activity.id).length ===
                          0
                      "
                      class="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2"
                    >
                      No documentation uploaded yet.
                    </p>

                    <Button
                      class="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium"
                      :disabled="isTaskUploading(activity.id)"
                      @click="saveActivity(activity)"
                    >
                      {{ isTaskUploading(activity.id) ? "Saving…" : "Save" }}
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
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
                    <span>{{ operation.staffNames.join(", ") }}</span>
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
                      class="border border-gray-100 rounded-lg p-4 mb-4"
                    >
                      <div class="flex justify-between items-start mb-3">
                        <div
                          class="text-xs text-gray-500 flex items-center gap-2"
                        >
                          <span class="font-bold bg-gray-100 px-1 rounded"
                            >CN</span
                          >
                          <span>{{
                            activity.executedByName || "Unknown Staff"
                          }}</span>
                        </div>
                        <Badge
                          v-if="activity.status"
                          :class="
                            activity.status === 'Good'
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-red-600 hover:bg-red-700 text-white'
                          "
                        >
                          {{
                            activity.status === "Good"
                              ? "Good condition"
                              : "Bad condition"
                          }}
                        </Badge>
                        <Badge v-else variant="outline" class="text-gray-400"
                          >Pending</Badge
                        >
                      </div>

                      <p class="text-sm text-gray-900 mb-3">
                        {{ activity.jobDescription }}
                      </p>

                      <Badge
                        v-if="activity.documentationRequired"
                        class="mb-3 bg-amber-100 text-amber-800 border border-amber-200"
                      >
                        Documentation Required
                      </Badge>

                      <div
                        v-if="activity.notes"
                        class="bg-slate-50 p-3 rounded text-sm text-gray-600 italic"
                      >
                        <span
                          class="font-medium text-slate-900 not-italic block mb-1"
                          >Note:</span
                        >
                        {{ activity.notes }}
                      </div>

                      <div
                        v-if="(activity.documentations?.length || 0) > 0"
                        class="mt-3"
                      >
                        <p class="text-xs font-medium text-gray-500 mb-2">
                          Uploaded Photos
                        </p>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                          <button
                            v-for="doc in activity.documentations"
                            :key="doc.id"
                            type="button"
                            class="relative rounded border border-gray-200 overflow-hidden hover:opacity-90"
                            @click="
                              openImagePreview(doc.filePath, doc.fileName)
                            "
                          >
                            <NuxtImg
                              :src="doc.filePath"
                              alt="Documentation preview"
                              width="200"
                              height="140"
                              format="webp"
                              loading="lazy"
                              class="w-full h-24 object-cover"
                            />
                            <span
                              class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate"
                            >
                              {{ doc.fileName }}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div v-if="monitorTab === 'tools'" class="col-span-12">
            <div class="space-y-4">
              <Card v-for="tool in tools" :key="tool.id">
                <CardContent class="p-4">
                  <div class="flex items-center justify-between mb-4">
                    <h4 class="font-medium text-gray-900">{{ tool.name }}</h4>
                    <Badge variant="outline">Qty: {{ tool.quantity }}</Badge>
                  </div>

                  <div class="grid grid-cols-2 gap-8">
                    <div class="space-y-2">
                      <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-500">Pre-Condition</span>
                        <Badge
                          v-if="tool.preStatus"
                          :class="
                            tool.preStatus === 'Good'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          "
                        >
                          {{ tool.preStatus }}
                        </Badge>
                        <span v-else class="text-gray-400">-</span>
                      </div>
                      <p
                        v-if="tool.preNote"
                        class="text-sm text-gray-600 bg-gray-50 p-2 rounded italic"
                      >
                        "{{ tool.preNote }}"
                      </p>
                    </div>

                    <div class="space-y-2">
                      <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-500">Post-Condition</span>
                        <Badge
                          v-if="tool.postStatus"
                          :class="
                            tool.postStatus === 'Good'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          "
                        >
                          {{ tool.postStatus }}
                        </Badge>
                        <span v-else class="text-gray-400">-</span>
                      </div>
                      <p
                        v-if="tool.postNote"
                        class="text-sm text-gray-600 bg-gray-50 p-2 rounded italic"
                      >
                        "{{ tool.postNote }}"
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div
                v-if="tools.length === 0"
                class="text-center py-12 text-gray-500 italic"
              >
                No tools listed for this operation.
              </div>
            </div>
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
