<script lang="ts" setup>
import { ArrowLeft, Download, FileText, Image as ImageIcon, Plus, Trash2 } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  summary: string;
  recommendation: string;
  pdfPath: string;
  generatedAt: string;
  notes: Array<{
    id: number;
    note: string;
    documentations: Array<{ id: number; fileName: string }>;
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

const route = useRoute();
const router = useRouter();
const operationId = computed(() => Number(route.params.id));
const generating = ref(false);
const summary = ref("");
const recommendation = ref("");
const notes = ref<ReportNoteForm[]>([{ id: 1, note: "", documentationIds: [] }]);
const nextNoteId = ref(2);

const { data, pending, error, refresh } = await useFetch<ReportResponse>(
  computed(() => `/api/operations/${operationId.value}/report`),
);

watch(
  () => data.value?.report,
  (report) => {
    if (!report) {
      summary.value = "";
      recommendation.value = "";
      notes.value = [{ id: 1, note: "", documentationIds: [] }];
      nextNoteId.value = 2;
      return;
    }

    summary.value = report.summary;
    recommendation.value = report.recommendation;
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

const operationTitle = computed(() => {
  const operation = data.value?.operation;
  if (!operation) return "Operation";
  return operation.vesselName || operation.company;
});

const canGenerate = computed(() => {
  const payload = data.value;
  if (!payload) return false;
  return payload.canGenerate && payload.operation.status === "Complete";
});

const reportPdfPath = computed(() => data.value?.report?.pdfPath || null);

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

  note.documentationIds = note.documentationIds.filter((id) => id !== documentationId);
};

const openPdf = (): void => {
  const path = reportPdfPath.value;
  if (!path) {
    toast.error("Report PDF is not available yet");
    return;
  }
  window.open(path, "_blank", "noopener,noreferrer");
};

const generateReport = async (): Promise<void> => {
  if (!canGenerate.value) {
    toast.error("Only supervisor can generate report for completed operation");
    return;
  }

  if (!summary.value.trim() || !recommendation.value.trim()) {
    toast.error("Summary and recommendation are required");
    return;
  }

  const normalizedNotes = notes.value
    .map((item) => ({
      note: item.note.trim(),
      documentationIds: item.documentationIds,
    }))
    .filter((item) => item.note.length > 0);

  if (normalizedNotes.length === 0) {
    toast.error("At least one note is required");
    return;
  }

  generating.value = true;
  try {
    await $fetch(`/api/operations/${operationId.value}/report`, {
      method: "POST",
      body: {
        summary: summary.value,
        recommendation: recommendation.value,
        notes: normalizedNotes,
      },
    });

    toast.success("Field report generated");
    await refresh();
  } catch (requestError: any) {
    toast.error(requestError?.data?.message || "Failed to generate field report");
  } finally {
    generating.value = false;
  }
};

const goBack = async (): Promise<void> => {
  await router.push(`/operations/${operationId.value}/execute`);
};
</script>

<template>
  <div class="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
    <div class="mb-6 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <Button variant="ghost" size="icon" @click="goBack">
          <ArrowLeft class="h-5 w-5" />
        </Button>
        <div>
          <h1 class="text-xl font-semibold text-gray-900">Field Report</h1>
          <p class="text-sm text-gray-600">{{ operationTitle }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Badge variant="secondary">{{ data?.operation.status || "-" }}</Badge>
        <Button
          variant="outline"
          class="gap-2"
          :disabled="!reportPdfPath"
          @click="openPdf"
        >
          <Download class="h-4 w-4" />
          Open PDF
        </Button>
      </div>
    </div>

    <div v-if="pending" class="py-16 text-center text-gray-500">Loading report...</div>
    <div v-else-if="error" class="py-16 text-center text-red-600">Failed to load report</div>

    <div v-else class="grid gap-6 lg:grid-cols-2">
      <Card class="border border-gray-200">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <FileText class="h-5 w-5 text-slate-600" />
            Report Form
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label for="summary">Summary</Label>
            <Textarea
              id="summary"
              v-model="summary"
              placeholder="Write operation summary..."
              class="min-h-24"
              :disabled="!canGenerate"
            />
          </div>

          <div class="space-y-2">
            <Label for="recommendation">Recommendation</Label>
            <Textarea
              id="recommendation"
              v-model="recommendation"
              placeholder="Write recommendation..."
              class="min-h-24"
              :disabled="!canGenerate"
            />
          </div>

          <Separator />

          <div class="flex items-center justify-between">
            <h2 class="font-medium text-gray-900">Notes</h2>
            <Button variant="outline" size="sm" class="gap-2" :disabled="!canGenerate" @click="addNote">
              <Plus class="h-4 w-4" />
              Add Note
            </Button>
          </div>

          <div v-for="note in notes" :key="note.id" class="rounded-lg border border-gray-200 p-3 space-y-3">
            <div class="flex items-start gap-2">
              <Input
                v-model="note.note"
                placeholder="Write note..."
                :disabled="!canGenerate"
              />
              <Button
                variant="ghost"
                size="icon"
                class="text-red-600"
                :disabled="!canGenerate || notes.length <= 1"
                @click="removeNote(note.id)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>

            <div class="space-y-2">
              <p class="text-xs font-medium text-gray-600">Attach Documentation</p>
              <div
                v-if="(data?.availableDocumentations?.length || 0) === 0"
                class="text-xs text-gray-500"
              >
                No documentation photos found.
              </div>
              <div v-else class="grid gap-2">
                <label
                  v-for="doc in data?.availableDocumentations || []"
                  :key="doc.id"
                  class="flex cursor-pointer items-center gap-2 rounded border border-gray-100 px-2 py-1.5 text-sm"
                >
                  <Checkbox
                    :model-value="note.documentationIds.includes(doc.id)"
                    :disabled="!canGenerate"
                    @update:model-value="(value) => setDocumentationChecked(note.id, doc.id, Boolean(value))"
                  />
                  <ImageIcon class="h-4 w-4 text-gray-500" />
                  <span class="truncate">{{ doc.fileName }}</span>
                </label>
              </div>
            </div>
          </div>

          <Button class="w-full" :disabled="!canGenerate || generating" @click="generateReport">
            {{ generating ? "Generating..." : data?.report ? "Regenerate Report" : "Generate Report" }}
          </Button>
        </CardContent>
      </Card>

      <Card class="border border-gray-200">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4 text-sm">
          <div>
            <p class="font-medium text-gray-900">Summary</p>
            <p class="mt-1 whitespace-pre-wrap text-gray-700">{{ summary || "-" }}</p>
          </div>
          <div>
            <p class="font-medium text-gray-900">Recommendation</p>
            <p class="mt-1 whitespace-pre-wrap text-gray-700">{{ recommendation || "-" }}</p>
          </div>
          <Separator />
          <div class="space-y-3">
            <p class="font-medium text-gray-900">Notes</p>
            <div v-for="(note, index) in notes" :key="note.id" class="rounded border border-gray-100 p-3">
              <p class="font-medium text-gray-800">{{ index + 1 }}. {{ note.note || "-" }}</p>
              <p class="mt-1 text-xs text-gray-600">
                Docs:
                {{ note.documentationIds.length }}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
