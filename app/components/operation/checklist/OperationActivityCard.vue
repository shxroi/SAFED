<script setup lang="ts">
import { Camera, Check, Images, X, Upload } from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  OperationActivity,
  OperationDocumentation,
} from "../../../../shared/types/operation-execution";
import type { PendingDocumentation } from "~/composables/operation/useExecutionDocumentation";

const props = withDefaults(
  defineProps<{
    activity: OperationActivity;
    editable?: boolean;
    maxDocsPerTask: number;
    isUploading?: boolean;
    visibleDocs: OperationDocumentation[];
    pendingDocs: PendingDocumentation[];
    deletedDocs: OperationDocumentation[];
    remainingSlots: number;
  }>(),
  {
    editable: false,
    isUploading: false,
  },
);

const emit = defineEmits<{
  "set-status": [status: "Good" | "Not Good"];
  "update-notes": [value: string];
  "add-documentation": [files: File[]];
  "remove-pending": [pendingId: string];
  "mark-delete": [docId: number];
  "undo-delete": [docId: number];
  "open-preview": [path: string, name: string, isLocal?: boolean];
  save: [];
}>();

const cameraInputId = computed(() => `doc-camera-${props.activity.id}`);
const galleryInputId = computed(() => `doc-gallery-${props.activity.id}`);

const showDocOptions = ref(false);

const executorInitials = computed(() => {
  const rawName = props.activity.executedByName?.trim();
  if (!rawName) return "US";

  const nameParts = rawName.split(/\s+/).filter(Boolean);
  if (nameParts.length === 1) {
    return (nameParts[0] || "").slice(0, 2).toUpperCase();
  }

  return `${nameParts[0]?.[0] || ""}${nameParts[1]?.[0] || ""}`.toUpperCase();
});

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const onFilesPicked = (event: Event): void => {
  const input = event.target as HTMLInputElement;
  const files = input.files ? Array.from(input.files) : [];
  emit("add-documentation", files);
  input.value = "";
  showDocOptions.value = false;
};
</script>

<template>
  <div
    :class="
      props.editable
        ? 'rounded-none border-0 bg-transparent p-0'
        : 'mb-3 rounded-lg border border-slate-200 bg-slate-50 p-4'
    "
  >
    <div v-if="!props.editable" class="mb-3 flex items-start justify-between">
      <div class="flex items-center gap-2 text-xs text-gray-500">
        <span class="rounded bg-gray-100 px-1 font-bold">{{ executorInitials }}</span>
        <span>{{ props.activity.executedByName || "Unknown Staff" }}</span>
      </div>
      <Badge
        v-if="props.activity.status"
        :class="
          props.activity.status === 'Good'
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-red-600 text-white hover:bg-red-700'
        "
      >
        {{
          props.activity.status === "Good" ? "Good condition" : "Bad condition"
        }}
      </Badge>
      <Badge v-else variant="outline" class="text-gray-400">Pending</Badge>
    </div>

    <p
      class="mb-4 rounded-lg bg-slate-100 px-4 py-3 text-slate-700"
    >
      {{ props.activity.jobDescription }}
    </p>

    <div
      v-if="props.editable"
      class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <span class="text-xl font-semibold text-slate-800">Condition</span>
      <div class="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          class="h-10 w-30 rounded-xl bg-emerald-300 text-emerald-800 hover:bg-emerald-400"
          :class="
            props.activity.status === 'Good' ? 'ring-2 ring-green-500' : ''
          "
          aria-label="Mark condition good"
          @click="emit('set-status', 'Good')"
        >
          <Check class="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          class="h-10 w-30 rounded-xl bg-rose-300 text-rose-800 hover:bg-rose-400"
          :class="
            props.activity.status === 'Not Good' ? 'ring-2 ring-red-500' : ''
          "
          aria-label="Mark condition not good"
          @click="emit('set-status', 'Not Good')"
        >
          <X class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <Textarea
      v-if="props.editable"
      :model-value="props.activity.notes || ''"
      placeholder="Type note here…"
      class="mb-4 min-h-[130px] rounded-xl border border-slate-200 bg-white text-base"
      @update:model-value="emit('update-notes', String($event || ''))"
    />

    <div v-if="props.editable" class="mb-4 space-y-3">
      <template v-if="props.activity.documentationRequired">
        <Button
          type="button"
          variant="outline"
          :disabled="props.isUploading || props.remainingSlots === 0"
          class="h-12 w-full gap-2 rounded-xl border-slate-200 bg-slate-100 text-base text-slate-600 hover:bg-slate-200"
          :aria-expanded="showDocOptions"
          aria-label="Open documentation upload options"
          @click="showDocOptions = !showDocOptions"
        >
          <Upload class="h-4 w-4" />
          Upload documentation
        </Button>

        <div
          v-if="showDocOptions"
          class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
          role="group"
          aria-label="Documentation upload options"
        >
          <label
            :for="cameraInputId"
            class="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100"
          >
            <Camera class="h-5 w-5 text-gray-500" />
            Take Photo
          </label>
          <label
            :for="galleryInputId"
            class="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100"
          >
            <Images class="h-5 w-5 text-gray-500" />
            Choose from Gallery
          </label>
        </div>

        <input
          :id="cameraInputId"
          type="file"
          accept="image/*"
          capture="environment"
          class="hidden"
          @change="onFilesPicked"
        />
        <input
          :id="galleryInputId"
          type="file"
          accept="image/*"
          multiple
          class="hidden"
          @change="onFilesPicked"
        />
      </template>
    </div>

    <div v-if="props.visibleDocs.length > 0" class="mb-4">
      <p class="mb-2 text-xs font-medium text-gray-500">Uploaded Photos</p>
      <div class="grid grid-cols-2 gap-2 md:grid-cols-3">
        <button
          v-for="doc in props.visibleDocs"
          :key="doc.id"
          type="button"
          class="relative overflow-hidden rounded border border-gray-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800"
          :aria-label="`Preview uploaded photo ${doc.fileName}`"
          @click="emit('open-preview', doc.filePath, doc.fileName)"
        >
          <NuxtImg
            :src="doc.filePath"
            alt="Documentation preview"
            width="200"
            height="150"
            format="webp"
            loading="lazy"
            class="h-24 w-full object-cover"
          />
          <span
            class="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-2 py-1 text-[10px] text-white"
          >
            {{ doc.fileName }} ({{ formatFileSize(doc.fileSize) }})
          </span>
        </button>
      </div>

      <div v-if="props.editable" class="mt-2 flex flex-wrap gap-2">
        <Button
          v-for="doc in props.visibleDocs"
          :key="`mark-delete-${doc.id}`"
          type="button"
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-xs text-red-600 hover:text-red-700"
          @click="emit('mark-delete', doc.id)"
        >
          Remove {{ doc.fileName }}
        </Button>
      </div>
    </div>

    <div
      v-if="props.editable && props.deletedDocs.length > 0"
      class="mb-4 rounded border border-orange-200 bg-orange-50 p-2"
    >
      <p class="mb-2 text-xs font-medium text-orange-700">
        Marked for removal (save to apply)
      </p>
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="doc in props.deletedDocs"
          :key="`undo-${doc.id}`"
          type="button"
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-xs"
          @click="emit('undo-delete', doc.id)"
        >
          Undo {{ doc.fileName }}
        </Button>
      </div>
    </div>

    <div v-if="props.editable && props.pendingDocs.length > 0" class="mb-4">
      <p class="mb-2 text-xs font-medium text-gray-500">
        Pending Photos (save to upload)
      </p>
      <div class="grid grid-cols-2 gap-2 md:grid-cols-3">
        <div
          v-for="pendingDoc in props.pendingDocs"
          :key="pendingDoc.id"
          class="relative overflow-hidden rounded border border-gray-200"
        >
          <button
            type="button"
            class="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800"
            :aria-label="`Preview pending photo ${pendingDoc.file.name}`"
            @click="
              emit(
                'open-preview',
                pendingDoc.previewUrl,
                pendingDoc.file.name,
                true,
              )
            "
          >
            <img
              :src="pendingDoc.previewUrl"
              :alt="pendingDoc.file.name"
              class="h-24 w-full object-cover"
            />
            <span
              class="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-2 py-1 text-[10px] text-white"
            >
              {{ pendingDoc.file.name }} ({{
                formatFileSize(pendingDoc.file.size)
              }})
            </span>
          </button>
          <button
            type="button"
            class="absolute right-1 top-1 rounded bg-white/90 px-1 text-xs text-red-600"
            :aria-label="`Remove pending photo ${pendingDoc.file.name}`"
            @click="emit('remove-pending', pendingDoc.id)"
          >
            Remove
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="!props.editable && props.activity.notes"
      class="rounded bg-slate-50 p-3 text-sm italic text-gray-600"
    >
      <span class="mb-1 block font-medium not-italic text-slate-900"
        >Note:</span
      >
      {{ props.activity.notes }}
    </div>

    <div v-if="props.editable" class="flex justify-end">
      <Button
        class="h-12 min-w-52 rounded-xl bg-slate-200 text-base font-semibold text-slate-900 hover:bg-slate-300"
        :disabled="props.isUploading"
        @click="emit('save')"
      >
        {{ props.isUploading ? "Saving…" : "Save" }}
      </Button>
    </div>
  </div>
</template>
