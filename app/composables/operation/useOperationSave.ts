import { ref } from "vue";
import type { Ref } from "vue";
import { toast } from "vue-sonner";
import type {
  OperationActivity,
  OperationSection,
  OperationTool,
} from "../../../shared/types/operation-execution";
import type { PendingDocumentation } from "./useExecutionDocumentation";

interface UseOperationSaveOptions {
  operationId: Ref<number>;
  tools: Ref<OperationTool[]>;
  sections: Ref<OperationSection[]>;
  isReadOnly: Ref<boolean>;
  pendingDocumentationByTask: Ref<Record<number, PendingDocumentation[]>>;
  deletedDocumentationByTask: Ref<Record<number, number[]>>;
  undoDocumentationDelete: (taskId: number, docId: number) => void;
  removePendingDocumentation: (taskId: number, pendingId: string) => void;
  clearTaskDocumentationDraft: (taskId: number) => void;
  fetchOperationDetail: () => Promise<void>;
}

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof (error as { data?: { message?: unknown } }).data?.message === "string"
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
  return fallback;
};

export const useOperationSave = ({
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
}: UseOperationSaveOptions) => {
  const saving = ref(false);
  const finishing = ref(false);
  const uploadingByTask = ref<Record<number, boolean>>({});

  const isTaskUploading = (taskId: number): boolean =>
    !!uploadingByTask.value[taskId];

  const setToolCondition = (
    toolIndex: number,
    type: "pre" | "post",
    status: "Good" | "Not Good",
  ): void => {
    if (isReadOnly.value) return;
    const tool = tools.value[toolIndex];
    if (!tool) return;
    if (type === "pre") tool.preStatus = status;
    else tool.postStatus = status;
  };

  const updateToolNote = (
    toolIndex: number,
    type: "pre" | "post",
    value: string,
  ): void => {
    if (isReadOnly.value) return;
    const tool = tools.value[toolIndex];
    if (!tool) return;
    if (type === "pre") tool.preNote = value;
    else tool.postNote = value;
  };

  const setActivityStatus = (
    sectionIndex: number,
    moduleIndex: number,
    activityIndex: number,
    status: "Good" | "Not Good",
  ): void => {
    if (isReadOnly.value) return;
    const activity =
      sections.value[sectionIndex]?.modules[moduleIndex]?.activities[activityIndex];
    if (activity) activity.status = status;
  };

  const saveTools = async (): Promise<void> => {
    if (isReadOnly.value || Number.isNaN(operationId.value) || operationId.value < 1)
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
      toast.error(extractErrorMessage(err, "Failed to save tools"));
    } finally {
      saving.value = false;
    }
  };

  const saveActivity = async (activity: OperationActivity): Promise<void> => {
    if (isReadOnly.value || Number.isNaN(operationId.value) || operationId.value < 1)
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
        body: { status: activity.status, notes: activity.notes },
      });

      for (const docId of deletedDocIds) {
        await $fetch(
          `/api/operations/${operationId.value}/tasks/${activity.id}/documentation/${docId}`,
          { method: "DELETE" },
        );
        undoDocumentationDelete(activity.id, docId);
      }

      for (const pendingDoc of pendingDocs) {
        const formData = new FormData();
        formData.append("file", pendingDoc.file);
        await $fetch(
          `/api/operations/${operationId.value}/tasks/${activity.id}/documentation`,
          { method: "POST", body: formData },
        );
        removePendingDocumentation(activity.id, pendingDoc.id);
      }

      clearTaskDocumentationDraft(activity.id);
      await fetchOperationDetail();
      toast.success("Activity saved successfully");
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Failed to save activity"));
    } finally {
      saving.value = false;
      uploadingByTask.value[activity.id] = false;
    }
  };

  const finishOperation = async (): Promise<void> => {
    if (isReadOnly.value || Number.isNaN(operationId.value) || operationId.value < 1)
      return;

    finishing.value = true;
    try {
      await $fetch(`/api/operations/${operationId.value}/complete`, {
        method: "POST",
      });
      toast.success("Operation completed successfully");
      await navigateTo("/operations");
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Failed to finish operation"));
    } finally {
      finishing.value = false;
    }
  };

  return {
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
  };
};
