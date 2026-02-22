<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DeleteConfimDialog from "@/components/DeleteConfimDialog.vue";
import ChecklistSidebarNav from "@/components/operation/create/ChecklistSidebarNav.vue";
import OperationFormCard from "@/components/operation/create/OperationFormCard.vue";
import SectionEditorPanel from "@/components/operation/create/SectionEditorPanel.vue";
import ToolsEditorPanel from "@/components/operation/create/ToolsEditorPanel.vue";
import { useChecklistBuilder } from "@/composables/operation/useChecklistBuilder";
import { useOperationForm } from "@/composables/operation/useOperationForm";
import { useOperationSubmit } from "@/composables/operation/useOperationSubmit";

const router = useRouter();
const route = useRoute();
const { user } = useAuth();

const operationId = computed<number | null>(() => {
  const idParam = route.query.id;
  if (typeof idParam !== "string") return null;
  const parsed = Number(idParam);
  if (Number.isNaN(parsed) || parsed < 1) return null;
  return parsed;
});

const isEditing = computed(() => operationId.value !== null);
const isOperationSaved = computed(() => operationId.value !== null);

const {
  sectionsList,
  toolsList,
  checklistView,
  selectedSection,
  createEmptySection,
  mapChecklistSections,
  toggleToolSelection,
  incrementToolById,
  decrementToolById,
  addSection,
  selectSection,
  addModule,
  removeModule,
  addActivity,
  removeActivity,
} = useChecklistBuilder();

const {
  formData,
  isStaffOpen,
  isDateOpen,
  toolOptions,
  supervisors,
  staffNameById,
  availableStaff,
  calendarDate,
  formatDate,
  isBasicInfoValid,
  toggleStaff,
  removeStaffById,
} = useOperationForm();

const finishDialogOpen = ref(false);

const { submitting, loadExistingOperation, handleSubmit } = useOperationSubmit({
  operationId,
  isEditing,
  isBasicInfoValid,
  formData,
  sectionsList,
  toolsList,
  createEmptySection,
  mapChecklistSections,
});

onMounted(async () => {
  if (user.value?.roles !== "IM") {
    await router.push("/operations");
    return;
  }
  await loadExistingOperation();
});

watch(
  () => operationId.value,
  async (nextId, previousId) => {
    if (nextId && nextId !== previousId) {
      await loadExistingOperation();
    }
  },
);
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="mx-auto p-4 sm:p-6 lg:p-8">
      <Card class="mb-8 border border-gray-200 shadow-sm">
        <CardContent>
          <OperationFormCard
            :form-data="formData"
            :calendar-date="calendarDate"
            :is-date-open="isDateOpen"
            :is-staff-open="isStaffOpen"
            :supervisors="supervisors"
            :available-staff="availableStaff"
            :staff-name-by-id="staffNameById"
            :is-basic-info-valid="isBasicInfoValid"
            :submitting="submitting"
            :format-date="formatDate"
            @update:is-date-open="isDateOpen = $event"
            @update:is-staff-open="isStaffOpen = $event"
            @update:calendar-date="calendarDate = $event"
            @toggle-staff="toggleStaff"
            @remove-staff="removeStaffById"
            @save="() => handleSubmit('Draft', false)"
          />
        </CardContent>
      </Card>

      <div
        class="grid grid-cols-1 gap-6 transition-all duration-200 lg:grid-cols-[280px_1fr]"
        :class="{ 'opacity-50 pointer-events-none blur-sm': !isOperationSaved }"
      >
        <div>
          <ChecklistSidebarNav
            :checklist-view="checklistView"
            :sections-list="sectionsList"
            :selected-section="selectedSection"
            @update:checklist-view="checklistView = $event"
            @select-section="selectSection"
            @add-section="addSection"
          />
        </div>

        <div>
          <Card
            v-if="checklistView === 'tools'"
            class="border border-gray-200 shadow-sm"
          >
            <CardContent class="px-4 sm:px-6">
              <ToolsEditorPanel
                :tools-list="toolsList"
                :tool-options="toolOptions"
                :submitting="submitting"
                @toggle-tool="toggleToolSelection"
                @increment-tool="incrementToolById"
                @decrement-tool="decrementToolById"
                @save="() => handleSubmit('Draft', false)"
              />
            </CardContent>
          </Card>

          <Card
            v-if="checklistView === 'operation' && selectedSection !== null"
            class="border border-gray-200 shadow-sm"
          >
            <CardContent class="px-4 sm:px-6">
              <SectionEditorPanel
                :sections-list="sectionsList"
                :selected-section="selectedSection"
                :submitting="submitting"
                @add-module="addModule"
                @remove-module="removeModule"
                @add-activity="addActivity"
                @remove-activity="removeActivity"
                @save="() => handleSubmit('Draft', false)"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div class="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          :disabled="!isBasicInfoValid || submitting"
          class="w-full border-gray-300 px-8 sm:w-auto"
          @click="() => handleSubmit('Draft', true)"
        >
          {{ submitting ? "Saving..." : "Save draft" }}
        </Button>
        <Button
          :disabled="!isBasicInfoValid || submitting"
          class="w-full bg-slate-900 px-8 text-white hover:bg-slate-800 sm:w-auto"
          @click="finishDialogOpen = true"
        >
          {{ submitting ? "Saving..." : "Finish Preparation" }}
        </Button>
      </div>
    </div>

    <DeleteConfimDialog
      v-model:open="finishDialogOpen"
      title="Finish Preparation?"
      description="This will mark the operation as Active and make it available to staff. Are you sure you want to proceed?"
      @confirm="
        () => {
          finishDialogOpen = false;
          handleSubmit('Active', true);
        }
      "
    />
  </div>
</template>
