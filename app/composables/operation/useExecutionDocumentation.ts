import type { OperationActivity } from "../../../shared/types/operation-execution";

export interface PendingDocumentation {
  id: string;
  file: File;
  previewUrl: string;
}

export const useExecutionDocumentation = (maxDocsPerTask: number) => {
  const previewOpen = ref(false);
  const previewImagePath = ref("");
  const previewImageName = ref("Documentation image");
  const previewImageIsLocal = ref(false);

  const pendingDocumentationByTask = ref<
    Record<number, PendingDocumentation[]>
  >({});
  const deletedDocumentationByTask = ref<Record<number, number[]>>({});

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
    return Math.max(0, maxDocsPerTask - used);
  };

  const clearTaskDocumentationDraft = (taskId: number): void => {
    const pending = pendingDocumentationByTask.value[taskId] || [];
    for (const item of pending) {
      URL.revokeObjectURL(item.previewUrl);
    }

    pendingDocumentationByTask.value[taskId] = [];
    deletedDocumentationByTask.value[taskId] = [];
  };

  const clearAllDocumentationDrafts = (): void => {
    for (const taskId of Object.keys(pendingDocumentationByTask.value)) {
      const numericTaskId = Number(taskId);
      if (!Number.isNaN(numericTaskId)) {
        clearTaskDocumentationDraft(numericTaskId);
      }
    }
  };

  const openImagePreview = (
    path: string,
    name: string,
    isLocal = false,
  ): void => {
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

  const addPendingDocumentation = (
    activity: OperationActivity,
    files: File[],
  ): { addedCount: number; skippedCount: number; skippedNonImage: boolean } => {
    const remainingSlots = getRemainingDocumentationSlots(activity);
    if (remainingSlots <= 0) {
      return {
        addedCount: 0,
        skippedCount: files.length,
        skippedNonImage: false,
      };
    }

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const selectedFiles = imageFiles.slice(0, remainingSlots);
    const skippedCount = files.length - selectedFiles.length;

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

    return {
      addedCount: selectedFiles.length,
      skippedCount,
      skippedNonImage: imageFiles.length !== files.length,
    };
  };

  return {
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
  };
};
