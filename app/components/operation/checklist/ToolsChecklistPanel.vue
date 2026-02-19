<script setup lang="ts">
import { Check, X } from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { OperationTool } from "../../../../shared/types/operation-execution";

const props = withDefaults(
  defineProps<{
    tools: OperationTool[];
    editable?: boolean;
    saving?: boolean;
  }>(),
  {
    editable: false,
    saving: false,
  },
);

const emit = defineEmits<{
  "set-condition": [
    toolIndex: number,
    type: "pre" | "post",
    status: "Good" | "Not Good",
  ];
  "update-note": [toolIndex: number, type: "pre" | "post", value: string];
  save: [];
}>();

const onNoteUpdate = (
  toolIndex: number,
  type: "pre" | "post",
  value: string,
): void => {
  emit("update-note", toolIndex, type, value);
};
</script>

<template>
  <div class="space-y-4">
    <div
      v-for="(tool, toolIndex) in props.tools"
      :key="tool.id"
      class="rounded-lg border border-gray-200 bg-slate-50 p-4"
    >
      <div class="mb-4 flex items-center justify-between">
        <h4 class="font-medium text-gray-900">{{ tool.name }}</h4>
        <span class="text-sm font-medium">QTY : {{ tool.quantity }}</span>
      </div>

      <div class="mb-4 space-y-3 border-b border-gray-200 pb-4">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Pre condition</span>
          <div v-if="props.editable" class="flex gap-2">
            <Button
              size="sm"
              class="h-8 w-12 bg-green-300 text-green-800 hover:bg-green-400"
              :class="tool.preStatus === 'Good' ? 'ring-2 ring-green-500' : ''"
              @click="emit('set-condition', toolIndex, 'pre', 'Good')"
            >
              <Check class="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              class="h-8 w-12 bg-red-300 text-red-800 hover:bg-red-400"
              :class="
                tool.preStatus === 'Not Good' ? 'ring-2 ring-red-500' : ''
              "
              @click="emit('set-condition', toolIndex, 'pre', 'Not Good')"
            >
              <X class="h-4 w-4" />
            </Button>
          </div>
          <Badge
            v-else-if="tool.preStatus"
            :class="
              tool.preStatus === 'Good'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            "
          >
            {{ tool.preStatus }}
          </Badge>
          <span v-else class="text-xs text-gray-400">-</span>
        </div>

        <Textarea
          v-if="tool.preStatus === 'Not Good' && props.editable"
          :model-value="tool.preNote || ''"
          placeholder="Type tool note here"
          class="bg-white"
          @update:model-value="
            (value) => onNoteUpdate(toolIndex, 'pre', String(value || ''))
          "
        />
        <p
          v-else-if="tool.preStatus === 'Not Good' && tool.preNote"
          class="rounded bg-gray-50 p-2 text-sm italic text-gray-600"
        >
          {{ tool.preNote }}
        </p>
      </div>

      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Post condition</span>
          <div v-if="props.editable" class="flex gap-2">
            <Button
              size="sm"
              class="h-8 w-12 bg-green-300 text-green-800 hover:bg-green-400"
              :class="tool.postStatus === 'Good' ? 'ring-2 ring-green-500' : ''"
              @click="emit('set-condition', toolIndex, 'post', 'Good')"
            >
              <Check class="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              class="h-8 w-12 bg-red-300 text-red-800 hover:bg-red-400"
              :class="
                tool.postStatus === 'Not Good' ? 'ring-2 ring-red-500' : ''
              "
              @click="emit('set-condition', toolIndex, 'post', 'Not Good')"
            >
              <X class="h-4 w-4" />
            </Button>
          </div>
          <Badge
            v-else-if="tool.postStatus"
            :class="
              tool.postStatus === 'Good'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            "
          >
            {{ tool.postStatus }}
          </Badge>
          <span v-else class="text-xs text-gray-400">-</span>
        </div>

        <Textarea
          v-if="tool.postStatus === 'Not Good' && props.editable"
          :model-value="tool.postNote || ''"
          placeholder="Type post-condition note"
          class="bg-white"
          @update:model-value="
            (value) => onNoteUpdate(toolIndex, 'post', String(value || ''))
          "
        />
        <p
          v-else-if="tool.postStatus === 'Not Good' && tool.postNote"
          class="rounded bg-gray-50 p-2 text-sm italic text-gray-600"
        >
          {{ tool.postNote }}
        </p>
      </div>
    </div>

    <div
      v-if="props.tools.length === 0"
      class="py-8 text-center text-sm text-gray-500"
    >
      No tools listed for this operation.
    </div>

    <Button
      v-if="props.editable && props.tools.length > 0"
      class="w-full border border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
      :disabled="props.saving"
      @click="emit('save')"
    >
      {{ props.saving ? "Saving…" : "Save" }}
    </Button>
  </div>
</template>
