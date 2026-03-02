<script lang="ts" setup>
import {
  ArrowLeft,
  Check,
  Download,
  GripVertical,
  Image as ImageIcon,
  Plus,
  Trash2,
} from "lucide-vue-next";
import { toast } from "vue-sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface ReportDocOption {
  id: number;
  taskId: number;
  filePath: string;
  fileName: string;
  timestamp: string;
}

interface ReportData {
  id: number;
  referenceNumber: string;
  serialNumber: string;
  crewName: string;
  crewSignRequired: boolean;
  pdfPath: string;
  generatedAt: string;
  notes: Array<{
    id: number;
    note: string;
    documentations: Array<{ id: number; fileName: string; filePath: string }>;
  }>;
}

interface ReportResponse {
  operation: {
    id: number;
    company: string;
    vesselName: string | null;
    type: string;
    status: string;
    date: string;
    location: string;
    supervisorName: string | null;
  };
  report: ReportData | null;
  canGenerate: boolean;
  availableDocumentations: ReportDocOption[];
}

interface ReportNoteForm {
  id: number;
  note: string;
  documentationIds: number[];
}

interface SubmitReportPayload {
  referenceNumber: string;
  serialNumber: string;
  crewName: string;
  crewSignRequired: boolean;
  notes: Array<{
    note: string;
    documentationIds: number[];
  }>;
}

interface GenerateReportResponse {
  report?: {
    id: number;
    pdfPath: string;
  };
}

const route = useRoute();
const router = useRouter();
const operationId = computed(() => Number(route.params.id));

const generating = ref(false);
const preparingPreview = ref(false);
const showDocumentationPicker = ref(false);
const showPdfPreview = ref(false);
const activeDocumentationNoteId = ref<number | null>(null);
const previewPdfUrl = ref<string | null>(null);
const referenceNumber = ref("");
const serialNumber = ref("");
const crewName = ref("");
const crewSignRequired = ref(false);
const notes = ref<ReportNoteForm[]>([
  { id: 1, note: "", documentationIds: [] },
]);
const nextNoteId = ref(2);

const { data, pending, error, refresh } = await useFetch<ReportResponse>(
  computed(() => `/api/operations/${operationId.value}/report`),
);

watch(
  () => data.value?.report,
  (report) => {
    if (!report) {
      referenceNumber.value = "";
      serialNumber.value = "";
      crewName.value = "";
      crewSignRequired.value = false;
      notes.value = [{ id: 1, note: "", documentationIds: [] }];
      nextNoteId.value = 2;
      return;
    }

    referenceNumber.value = report.referenceNumber;
    serialNumber.value = report.serialNumber;
    crewName.value = report.crewName;
    crewSignRequired.value = report.crewSignRequired;
    notes.value = report.notes.length
      ? report.notes.map((item, index) => ({
          id: index + 1,
          note: item.note,
          documentationIds: item.documentations.map((doc) => doc.id),
        }))
      : [{ id: 1, note: "", documentationIds: [] }];
    nextNoteId.value = notes.value.length + 1;
  },
  { immediate: true },
);

watch(crewSignRequired, (required) => {
  if (!required) {
    crewName.value = "";
  }
});

const operationTitle = computed(() => {
  const operation = data.value?.operation;
  if (!operation) return "Operation";
  return operation.vesselName || operation.company;
});

const operationDateLabel = computed(() => {
  const value = data.value?.operation?.date;
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
});

const canGenerate = computed(() => {
  const payload = data.value;
  if (!payload) return false;
  return payload.canGenerate;
});

const hasPublishedReport = computed(() =>
  Boolean(data.value?.report?.pdfPath),
);

const generatedPdfPath = computed(() => data.value?.report?.pdfPath || "");

const generatedAtLabel = computed(() => {
  const value = data.value?.report?.generatedAt;
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
});

const waitingReportMessage = computed(() => {
  if (data.value?.operation.status !== "Complete") {
    return "Report will be available after operation is completed.";
  }
  return "Supervisor has not generated the field report yet.";
});

const availableDocumentations = computed(
  () => data.value?.availableDocumentations || [],
);

const docsById = computed(
  () =>
    new Map(availableDocumentations.value.map((doc) => [doc.id, doc] as const)),
);

const activeDocumentationNote = computed(() =>
  notes.value.find((item) => item.id === activeDocumentationNoteId.value),
);

const addNote = (): void => {
  notes.value.push({ id: nextNoteId.value, note: "", documentationIds: [] });
  nextNoteId.value += 1;
};

const removeNote = (noteId: number): void => {
  if (notes.value.length <= 1) return;
  notes.value = notes.value.filter((item) => item.id !== noteId);
};

const setDocumentationChecked = (
  noteId: number,
  documentationId: number,
  checked: boolean,
): void => {
  const note = notes.value.find((item) => item.id === noteId);
  if (!note) return;

  if (checked) {
    if (!note.documentationIds.includes(documentationId)) {
      note.documentationIds.push(documentationId);
    }
    return;
  }

  note.documentationIds = note.documentationIds.filter(
    (id) => id !== documentationId,
  );
};

const openDocumentationPicker = (noteId: number): void => {
  activeDocumentationNoteId.value = noteId;
  showDocumentationPicker.value = true;
};

const closeDocumentationPicker = (): void => {
  showDocumentationPicker.value = false;
  activeDocumentationNoteId.value = null;
};

const toggleActiveDocumentation = (documentationId: number): void => {
  const note = activeDocumentationNote.value;
  if (!note) return;
  const checked = !note.documentationIds.includes(documentationId);
  setDocumentationChecked(note.id, documentationId, checked);
};

const draggingNoteId = ref<number | null>(null);
const dragOverNoteId = ref<number | null>(null);

const reorderAttachmentNotes = (
  draggedNoteId: number,
  targetNoteId: number,
): void => {
  const fromIndex = notes.value.findIndex((note) => note.id === draggedNoteId);
  const toIndex = notes.value.findIndex((note) => note.id === targetNoteId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

  const [movedNote] = notes.value.splice(fromIndex, 1);
  if (!movedNote) return;
  notes.value.splice(toIndex, 0, movedNote);
};

const onAttachmentCardDragStart = (noteId: number, event: DragEvent): void => {
  if (!canGenerate.value) return;
  draggingNoteId.value = noteId;
  dragOverNoteId.value = null;

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(noteId));
  }
};

const onAttachmentCardDragOver = (noteId: number, event: DragEvent): void => {
  if (!draggingNoteId.value || draggingNoteId.value === noteId) return;

  event.preventDefault();
  dragOverNoteId.value = noteId;
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
};

const onAttachmentCardDrop = (noteId: number, event: DragEvent): void => {
  if (!draggingNoteId.value || draggingNoteId.value === noteId) return;

  event.preventDefault();
  reorderAttachmentNotes(draggingNoteId.value, noteId);
  dragOverNoteId.value = null;
};

const onAttachmentCardDragEnd = (): void => {
  draggingNoteId.value = null;
  dragOverNoteId.value = null;
};

const getSelectedDocumentations = (noteId: number): ReportDocOption[] => {
  const note = notes.value.find((item) => item.id === noteId);
  if (!note) return [];
  return note.documentationIds
    .map((docId) => docsById.value.get(docId))
    .filter(Boolean) as ReportDocOption[];
};

const isActiveDocumentationSelected = (documentationId: number): boolean =>
  activeDocumentationNote.value?.documentationIds.includes(documentationId) ||
  false;

const formatDocumentationDate = (timestamp: string): string =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));

const revokePreviewPdfUrl = (): void => {
  if (!previewPdfUrl.value) return;
  URL.revokeObjectURL(previewPdfUrl.value);
  previewPdfUrl.value = null;
};

const closePdfPreview = (): void => {
  showPdfPreview.value = false;
  revokePreviewPdfUrl();
};

const buildSubmitPayload = (): SubmitReportPayload | null => {
  if (!canGenerate.value) {
    toast.error("You are not allowed to generate report for this operation");
    return null;
  }

  if (!referenceNumber.value.trim()) {
    toast.error("Reference number is required");
    return null;
  }

  if (!serialNumber.value.trim()) {
    toast.error("Serial number is required");
    return null;
  }

  if (crewSignRequired.value && !crewName.value.trim()) {
    toast.error("Crew name is required");
    return null;
  }

  const normalizedNotes = notes.value
    .map((item) => ({
      note: item.note.trim(),
      documentationIds: item.documentationIds,
    }))
    .filter((item) => item.note.length > 0);

  if (normalizedNotes.length === 0) {
    toast.error("At least one attachment note is required");
    return null;
  }

  return {
    referenceNumber: referenceNumber.value,
    serialNumber: serialNumber.value,
    crewName: crewSignRequired.value ? crewName.value : "",
    crewSignRequired: crewSignRequired.value,
    notes: normalizedNotes,
  };
};

const downloadPdf = (path: string): void => {
  const link = document.createElement("a");
  link.href = path;
  link.download = `field-report-${operationId.value}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const reviewGeneratedReport = (): void => {
  if (!generatedPdfPath.value) {
    toast.error("Field report is not generated yet");
    return;
  }

  window.open(generatedPdfPath.value, "_blank", "noopener,noreferrer");
};

const downloadGeneratedReport = (): void => {
  if (!generatedPdfPath.value) {
    toast.error("Field report is not generated yet");
    return;
  }

  downloadPdf(generatedPdfPath.value);
};

const openInlinePreview = async (): Promise<void> => {
  const payload = buildSubmitPayload();
  if (!payload) return;

  preparingPreview.value = true;
  try {
    const pdfBuffer = await $fetch<ArrayBuffer>(
      `/api/operations/${operationId.value}/report/preview`,
      {
        method: "POST",
        body: payload,
        responseType: "arrayBuffer",
      },
    );

    revokePreviewPdfUrl();
    const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });
    previewPdfUrl.value = URL.createObjectURL(pdfBlob);
    showPdfPreview.value = true;
  } catch (requestError: any) {
    toast.error(requestError?.data?.message || "Failed to generate preview");
  } finally {
    preparingPreview.value = false;
  }
};

const generateReport = async (): Promise<void> => {
  const payload = buildSubmitPayload();
  if (!payload) return;

  generating.value = true;
  try {
    const response = await $fetch<GenerateReportResponse>(
      `/api/operations/${operationId.value}/report`,
      {
        method: "POST",
        body: payload,
      },
    );

    toast.success("Field report generated");
    if (response.report?.pdfPath) {
      downloadPdf(response.report.pdfPath);
    }
    await refresh();
  } catch (requestError: any) {
    toast.error(
      requestError?.data?.message || "Failed to generate field report",
    );
  } finally {
    generating.value = false;
  }
};

const goBack = async (): Promise<void> => {
  await router.push(`/operations/${operationId.value}/execute`);
};

onBeforeUnmount(() => {
  revokePreviewPdfUrl();
});
</script>

<template>
  <div class="p-4 md:p-6 lg:p-8">
    <div class="mb-6 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <Button variant="ghost" size="icon" @click="goBack">
          <ArrowLeft class="h-5 w-5" />
        </Button>
        <div>
          <h1 class="text-xl font-semibold text-gray-900">Operation Report</h1>
          <p class="text-sm text-gray-600">{{ operationTitle }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Badge variant="secondary" class="bg-green-300">{{ data?.operation.status || "-" }}</Badge>
      </div>
    </div>

    <div v-if="pending" class="py-16 text-center text-gray-500">
      Loading report…
    </div>
    <div v-else-if="error" class="py-16 text-center text-red-600">
      Failed to load report
    </div>

    <div v-else class="space-y-6">
      <Card v-if="hasPublishedReport" class="border border-gray-200">
        <CardHeader
          class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"
        >
          <div>
            <CardTitle>Generated Report</CardTitle>
            <p class="text-sm text-gray-600">Generated at {{ generatedAtLabel }}</p>
          </div>
          <div class="flex w-full gap-2 sm:w-auto">
            <Button
              variant="outline"
              class="w-full sm:w-auto"
              :disabled="!generatedPdfPath"
              @click="reviewGeneratedReport"
            >
              Review
            </Button>
            <Button
              variant="outline"
              class="w-full gap-2 sm:w-auto"
              :disabled="!generatedPdfPath"
              @click="downloadGeneratedReport"
            >
              <Download class="h-4 w-4" />
              Download
            </Button>
          </div>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-3 text-sm sm:grid-cols-2">
            <div class="grid grid-cols-3 gap-2">
              <span class="font-medium">Reference</span>
              <span class="col-span-2">{{ data?.report?.referenceNumber || "-" }}</span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <span class="font-medium">Serial</span>
              <span class="col-span-2">{{ data?.report?.serialNumber || "-" }}</span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <span class="font-medium">Crew Sign</span>
              <span class="col-span-2">{{ data?.report?.crewSignRequired ? "Required" : "Not required" }}</span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <span class="font-medium">Crew Name</span>
              <span class="col-span-2">{{ data?.report?.crewName || "-" }}</span>
            </div>
          </div>

          <div class="h-[75vh] overflow-hidden rounded-md border border-gray-200 bg-white">
            <iframe
              v-if="generatedPdfPath"
              :src="generatedPdfPath"
              title="Generated field report"
              class="h-full w-full"
            />
            <div
              v-else
              class="flex h-full items-center justify-center text-sm text-gray-500"
            >
              Report file is unavailable.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card v-else-if="!canGenerate" class="border border-gray-200">
        <CardHeader>
          <CardTitle>Report Not Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-sm text-gray-600">{{ waitingReportMessage }}</p>
        </CardContent>
      </Card>

      <template v-else>
        <Card class="border border-gray-200">
          <CardHeader>
            <CardTitle>Report Form</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="mb-3 grid gap-3 text-sm md:grid-cols-2">
              <div class="grid grid-cols-3 gap-2">
                <span class="w-24 font-medium">Vessel name</span>
                <span class="md:col-span-2">{{ operationTitle }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <span class="w-24 font-medium">Location</span>
                <span class="md:col-span-2">{{ data?.operation.location || "-" }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <span class="w-24 font-medium">Date</span>
                <span class="col-span-2">{{ operationDateLabel }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <span class="font-medium">Supervisor</span>
                <span class="col-span-2">{{ data?.operation.supervisorName || "-" }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <Label for="referenceNumber">Reference Number</Label>
                <Input
                  id="referenceNumber"
                  v-model="referenceNumber"
                  class="col-span-2"
                  placeholder="Enter reference number"
                  :disabled="!canGenerate"
                />
              </div>
              <div class="grid grid-cols-3 gap-2">
                <Label for="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  v-model="serialNumber"
                  class="col-span-2"
                  placeholder="Enter module serial number"
                  :disabled="!canGenerate"
                />
              </div>
              <div
                v-if="crewSignRequired"
                class="grid grid-cols-3 gap-2 md:col-span-2 md:grid-cols-6"
              >
                <Label for="crewName">Crew Name</Label>
                <Input
                  id="crewName"
                  v-model="crewName"
                  class="col-span-2 md:col-span-5"
                  placeholder="Captain/chief/chief engineer"
                  :disabled="!canGenerate"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter class="flex justify-between gap-2">
            <p class="text-sm text-muted-foreground">Crew sign required</p>
            <Switch
              v-model:model-value="crewSignRequired"
              :disabled="!canGenerate"
            />
          </CardFooter>
        </Card>

        <Card class="border border-gray-200">
          <CardHeader class="flex items-center justify-between">
            <h2 class="font-medium text-gray-900">Attachment</h2>
            <Button
              variant="outline"
              size="sm"
              class="gap-2"
              :disabled="!canGenerate"
              @click="addNote"
            >
              <Plus class="h-4 w-4" />
              Add Attachment
            </Button>
          </CardHeader>

          <CardContent class="flex flex-col gap-3">
            <div
              v-for="note in notes"
              :key="note.id"
              class="flex gap-2 rounded-lg border border-gray-200 p-3 transition"
              :class="[
                canGenerate && notes.length > 1 ? 'cursor-move' : '',
                dragOverNoteId === note.id ? 'border-slate-500 bg-slate-50' : '',
              ]"
              :draggable="canGenerate && notes.length > 1"
              @dragstart="(event) => onAttachmentCardDragStart(note.id, event)"
              @dragover="(event) => onAttachmentCardDragOver(note.id, event)"
              @drop="(event) => onAttachmentCardDrop(note.id, event)"
              @dragend="onAttachmentCardDragEnd"
            >
              <div class="flex cursor-pointer items-center self-stretch">
                <GripVertical class="h-5 w-5 text-gray-300" />
              </div>
              <div class="flex-1 space-y-3 min-w-0 ">
                <div class="flex items-start gap-2">
                  <Textarea
                    v-model="note.note"
                    placeholder="Type attachment note here"
                    class="min-h-20"
                    :disabled="!canGenerate"
                  />
                </div>

                <div class="space-y-2">
                  <p class="text-xs font-medium text-gray-600">
                    Choose Documentation
                  </p>
                  <div
                    v-if="(availableDocumentations.length || 0) === 0"
                    class="text-xs text-gray-500"
                  >
                    No documentation photos found.
                  </div>
                  <div v-else class="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      class="w-full justify-start text-gray-600 gap-2 truncate"
                      :disabled="!canGenerate"
                      @click="openDocumentationPicker(note.id)"
                    >
                      <ImageIcon class="h-4 w-4" />
                      Select documentation images ({{ note.documentationIds.length }})
                    </Button>

                    <div
                      v-if="note.documentationIds.length === 0"
                      class="text-xs text-gray-500"
                    >
                      No image selected yet.
                    </div>

                    <div
                      v-if="note.documentationIds.length > 0"
                      class="grid grid-cols-2 gap-2 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-9"
                    >
                      <div
                        v-for="doc in getSelectedDocumentations(note.id)"
                        :key="doc.id"
                        class="relative overflow-hidden rounded border border-gray-200"
                      >
                        <NuxtImg
                          :src="doc.filePath"
                          :alt="doc.fileName"
                          format="webp"
                          loading="lazy"
                          class="aspect-square w-full object-cover sm:h-24"
                        />
                        <span
                          class="absolute bottom-0 left-0 right-0 truncate bg-black/65 px-2 py-1 text-[10px] text-white"
                        >
                          {{ doc.fileName }}
                        </span>
                        <button
                          v-if="canGenerate"
                          type="button"
                          class="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-red-600"
                          :aria-label="`Remove ${doc.fileName}`"
                          @click="setDocumentationChecked(note.id, doc.id, false)"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex cursor-pointer items-center self-stretch">
                <Button
                  variant="ghost"
                  size="icon"
                  class="w-fit text-red-600"
                  :disabled="!canGenerate || notes.length <= 1"
                  @click="removeNote(note.id)"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div class="grid gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            class="w-full"
            :disabled="!canGenerate || preparingPreview || generating"
            @click="openInlinePreview"
          >
            {{ preparingPreview ? "Preparing preview…" : "Open Preview" }}
          </Button>
          <Button
            variant="outline"
            class="w-full"
            :disabled="!canGenerate || generating"
            @click="generateReport"
          >
            {{ generating ? "Generating…" : "Generate Report" }}
          </Button>
        </div>
      </template>
    </div>

    <Dialog
      :open="showDocumentationPicker"
      @update:open="(value) => !value && closeDocumentationPicker()"
    >
      <DialogContent class="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Select Documentation Images</DialogTitle>
        </DialogHeader>

        <p class="text-sm text-gray-600">
          Choose one or more images for this attachment note.
        </p>

        <div class="max-h-[65vh] overflow-y-auto pr-1">
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <button
              v-for="doc in availableDocumentations"
              :key="doc.id"
              type="button"
              class="relative overflow-hidden rounded-lg border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700"
              :class="[
                isActiveDocumentationSelected(doc.id)
                  ? 'border-slate-900 ring-2 ring-slate-200'
                  : 'border-gray-200 hover:border-gray-300',
              ]"
              @click="toggleActiveDocumentation(doc.id)"
            >
              <NuxtImg
                :src="doc.filePath"
                :alt="doc.fileName"
                format="webp"
                loading="lazy"
                class="h-28 w-full object-cover"
              />
              <div class="space-y-1 px-2 py-2">
                <p class="truncate text-xs font-medium text-gray-900">
                  {{ doc.fileName }}
                </p>
                <p class="text-[11px] text-gray-500">
                  {{ formatDocumentationDate(doc.timestamp) }}
                </p>
              </div>
              <div
                v-if="isActiveDocumentationSelected(doc.id)"
                class="absolute right-2 top-2 rounded-full bg-slate-900 p-1 text-white"
              >
                <Check class="h-3 w-3" />
              </div>
            </button>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            @click="closeDocumentationPicker"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog
      :open="showPdfPreview"
      @update:open="(value) => !value && closePdfPreview()"
    >
      <DialogContent class="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Report Preview</DialogTitle>
        </DialogHeader>

        <div
          class="h-[75vh] overflow-hidden rounded-md border border-gray-200 bg-white"
        >
          <iframe
            v-if="previewPdfUrl"
            id="pdf-preview-iframe"
            :src="previewPdfUrl"
            title="PDF preview"
            class="h-full w-full"
          />
          <div
            v-else
            class="flex h-full items-center justify-center text-sm text-gray-500"
          >
            Preview is not available.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
