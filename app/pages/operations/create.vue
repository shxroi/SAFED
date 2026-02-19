<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import { CalendarDate } from "@internationalized/date";
import {
  ChevronRight,
  Minus,
  Plus,
  Trash2,
  User,
  Users,
  X,
} from "lucide-vue-next";
import { toast } from "vue-sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { OPERATION_TYPE_OPTIONS } from "@/constants/operation";
import type { OperationType } from "../../../shared/types/operation";

interface StaffMember {
  id: number;
  name: string;
}

interface OperationDetailResponse {
  operation: {
    id: number;
    type: OperationType;
    status: "Draft" | "Active" | "Complete" | "Cancelled";
    company: string;
    vesselName: string | null;
    location: string;
    date: string;
    enrollments?: Array<{
      userId: number;
      operationRole: "SUPERVISOR" | "STAFF";
    }>;
  };
}

interface ChecklistToolInput {
  toolId: number | null;
  quantity: number;
}

interface ToolOption {
  id: number;
  name: string;
}

interface ChecklistActivityInput {
  id?: number;
  description: string;
  documentationRequired: boolean;
}

interface ChecklistModuleInput {
  id?: number;
  name: string;
  activities: ChecklistActivityInput[];
}

interface ChecklistSectionInput {
  id?: number;
  name: string;
  modules: ChecklistModuleInput[];
}

interface ChecklistResponse {
  tools?: Array<{
    id: number;
    toolId: number;
    name: string;
    quantity: number;
  }>;
  sections?: Array<{
    id: number;
    name: string;
    modules?: Array<{
      id: number;
      name: string;
      activities?: Array<{
        id: number;
        jobDescription?: string;
        description?: string;
        documentationRequired?: boolean;
      }>;
    }>;
  }>;
}

const router = useRouter();
const route = useRoute();
const { user } = useAuth();

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

const operationId = computed<number | null>(() => {
  const idParam = route.query.id;
  if (typeof idParam !== "string") return null;

  const parsed = Number(idParam);
  if (Number.isNaN(parsed) || parsed < 1) return null;

  return parsed;
});

const isEditing = computed(() => operationId.value !== null);
const isOperationSaved = computed(() => operationId.value !== null);

const checklistView = ref<"tools" | "operation">("tools");
const selectedSection = ref<number | null>(0);
const isStaffOpen = ref(false);
const isDateOpen = ref(false);
const submitting = ref(false);

const formData = ref({
  type: "" as OperationType | "",
  company: "",
  vesselName: "",
  location: "",
  date: null as Date | null,
  supervisorId: null as number | null,
  staffIds: [] as number[],
});

const createEmptyActivity = (): ChecklistActivityInput => ({
  description: "",
  documentationRequired: false,
});

const createEmptyModule = (): ChecklistModuleInput => ({
  name: "Module",
  activities: [createEmptyActivity()],
});

const createEmptySection = (): ChecklistSectionInput => ({
  name: "Section",
  modules: [createEmptyModule()],
});

const sectionsList = ref<ChecklistSectionInput[]>([createEmptySection()]);
const toolsList = ref<ChecklistToolInput[]>([]);

const { data: staffData } = await useFetch<{ users: StaffMember[] }>(
  "/api/users",
  {
    query: { roles: "STAFF" },
  },
);

const { data: toolsData } = await useFetch<{ tools: ToolOption[] }>(
  "/api/tools",
  {
    query: { page: 1, limit: 200 },
  },
);

const staffList = computed(() => staffData.value?.users ?? []);
const toolOptions = computed(() => toolsData.value?.tools ?? []);
const supervisors = computed(() => staffList.value);
const staffNameById = computed(() => {
  return new Map(staffList.value.map((staff) => [staff.id, staff.name]));
});

const availableStaff = computed(() => {
  return staffList.value.filter(
    (staff) => staff.id !== formData.value.supervisorId,
  );
});

watch(
  () => formData.value.supervisorId,
  (supervisorId) => {
    if (supervisorId === null) return;
    formData.value.staffIds = formData.value.staffIds.filter(
      (staffId) => staffId !== supervisorId,
    );
  },
);

const dateToCalendarDate = (date: Date | null): CalendarDate | undefined => {
  if (!date) return undefined;
  return new CalendarDate(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
};

const calendarDateToDate = (
  calendarValue: CalendarDate | undefined,
): Date | null => {
  if (!calendarValue) return null;
  return new Date(
    calendarValue.year,
    calendarValue.month - 1,
    calendarValue.day,
  );
};

const calendarDate = computed({
  get: () => dateToCalendarDate(formData.value.date),
  set: (value) => {
    formData.value.date = calendarDateToDate(value);
  },
});

const formatDate = (date: Date | null): string => {
  if (!date) return "Pick a date";

  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const mapChecklistSections = (
  sections: ChecklistResponse["sections"] = [],
): ChecklistSectionInput[] => {
  return sections.map((section) => ({
    id: section.id,
    name: section.name,
    modules: (section.modules ?? []).map((module) => ({
      id: module.id,
      name: module.name || "Module",
      activities: (module.activities ?? []).map((activity) => ({
        id: activity.id,
        description: activity.jobDescription || activity.description || "",
        documentationRequired: activity.documentationRequired ?? false,
      })),
    })),
  }));
};

const loadExistingOperation = async (): Promise<void> => {
  if (!operationId.value) return;

  try {
    const [operationResponse, checklistResponse] = await Promise.all([
      $fetch<OperationDetailResponse>(`/api/operations/${operationId.value}`),
      $fetch<ChecklistResponse>(
        `/api/operations/${operationId.value}/checklist`,
      ),
    ]);

    const operation = operationResponse.operation;
    const enrollments = operation.enrollments ?? [];

    formData.value = {
      type: operation.type,
      company: operation.company,
      vesselName: operation.vesselName || "",
      location: operation.location,
      date: new Date(operation.date),
      supervisorId:
        enrollments.find(
          (enrollment) => enrollment.operationRole === "SUPERVISOR",
        )?.userId || null,
      staffIds: enrollments
        .filter((enrollment) => enrollment.operationRole === "STAFF")
        .map((enrollment) => enrollment.userId),
    };

    toolsList.value = (checklistResponse.tools ?? []).map((tool) => ({
      toolId: tool.toolId,
      quantity: tool.quantity,
    }));

    const mappedSections = mapChecklistSections(
      checklistResponse.sections ?? [],
    );
    sectionsList.value =
      mappedSections.length > 0 ? mappedSections : [createEmptySection()];
    selectedSection.value = 0;
  } catch (err: unknown) {
    toast.error(getErrorMessage(err, "Failed to load operation"));
    await router.push("/operations");
  }
};

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

const addTool = () => {
  toolsList.value.push({ toolId: null, quantity: 1 });
};

const removeTool = (index: number) => {
  toolsList.value.splice(index, 1);
};

const incrementQuantity = (index: number) => {
  const tool = toolsList.value[index];
  if (tool) tool.quantity += 1;
};

const decrementQuantity = (index: number) => {
  const tool = toolsList.value[index];
  if (tool && tool.quantity > 1) tool.quantity -= 1;
};

const toggleStaff = (staffId: number) => {
  const index = formData.value.staffIds.indexOf(staffId);

  if (index > -1) {
    formData.value.staffIds.splice(index, 1);
    return;
  }

  formData.value.staffIds.push(staffId);
};

const removeStaffById = (staffId: number) => {
  formData.value.staffIds = formData.value.staffIds.filter(
    (id) => id !== staffId,
  );
};

const addSection = () => {
  sectionsList.value.push(createEmptySection());
  selectedSection.value = sectionsList.value.length - 1;
};

const removeSection = (index: number) => {
  sectionsList.value.splice(index, 1);

  if (sectionsList.value.length === 0) {
    selectedSection.value = null;
    return;
  }

  if (selectedSection.value === null) return;
  if (selectedSection.value === index) {
    selectedSection.value = Math.max(0, index - 1);
  } else if (selectedSection.value > index) {
    selectedSection.value -= 1;
  }
};

const selectSection = (index: number) => {
  selectedSection.value = index;
};

const addModule = (sectionIndex: number) => {
  const section = sectionsList.value[sectionIndex];
  if (!section) return;

  section.modules.push(createEmptyModule());
};

const removeModule = (sectionIndex: number, moduleIndex: number) => {
  const section = sectionsList.value[sectionIndex];
  if (!section) return;

  section.modules.splice(moduleIndex, 1);
};

const addActivity = (sectionIndex: number, moduleIndex: number) => {
  const section = sectionsList.value[sectionIndex];
  const module = section?.modules[moduleIndex];
  if (!module) return;

  module.activities.push(createEmptyActivity());
};

const removeActivity = (
  sectionIndex: number,
  moduleIndex: number,
  activityIndex: number,
) => {
  const section = sectionsList.value[sectionIndex];
  const module = section?.modules[moduleIndex];
  if (!module) return;

  module.activities.splice(activityIndex, 1);
};

const isBasicInfoValid = computed(() => {
  return !!(
    formData.value.type &&
    formData.value.company.trim() &&
    formData.value.location.trim() &&
    formData.value.date
  );
});

const buildOperationPayload = () => ({
  company: formData.value.company.trim(),
  type: formData.value.type,
  vesselName: formData.value.vesselName.trim() || null,
  location: formData.value.location.trim(),
  date: formData.value.date?.toISOString(),
  supervisorId: formData.value.supervisorId,
  staffIds: [...formData.value.staffIds],
});

const buildChecklistPayload = () => {
  const tools = toolsList.value
    .map((tool) => ({
      toolId: tool.toolId,
      quantity: tool.quantity,
    }))
    .filter((tool) => !!tool.toolId);

  const sections = sectionsList.value
    .map((section) => ({
      name: section.name.trim(),
      modules: section.modules.map((module) => ({
        name: module.name.trim() || "Module",
        activities: module.activities
          .map((activity) => ({
            description: activity.description.trim(),
            documentationRequired: activity.documentationRequired,
          }))
          .filter((activity) => activity.description.length > 0),
      })),
    }))
    .filter((section) => section.name.length > 0);

  return { tools, sections };
};

const saveOperation = async (
  nextStatus: "Draft" | "Active",
): Promise<number> => {
  const payload = buildOperationPayload();
  const payloadWithStatus = {
    ...payload,
    status: nextStatus,
  };

  if (isEditing.value && operationId.value) {
    await $fetch(`/api/operations/${operationId.value}`, {
      method: "PUT",
      body: payloadWithStatus,
    });

    return operationId.value;
  }

  const response = await $fetch<{ operation?: { id: number } }>(
    "/api/operations",
    {
      method: "POST",
      body: payloadWithStatus,
    },
  );

  const nextId = response.operation?.id;
  if (!nextId) {
    throw createError({
      statusCode: 500,
      message: "Operation save did not return an ID",
    });
  }

  await router.replace({
    query: {
      ...route.query,
      id: String(nextId),
    },
  });

  return nextId;
};

const saveChecklist = async (savedOperationId: number): Promise<void> => {
  const payload = buildChecklistPayload();

  await $fetch(`/api/operations/${savedOperationId}/checklist`, {
    method: "PUT",
    body: payload,
  });
};

const handleSubmit = async (
  targetStatus: "Draft" | "Active" = "Draft",
  shouldRedirect = true,
) => {
  if (submitting.value) return;

  if (!isBasicInfoValid.value) {
    toast.error("Please fill in all required fields");
    return;
  }

  submitting.value = true;

  try {
    const savedOperationId = await saveOperation(targetStatus);
    await saveChecklist(savedOperationId);

    toast.success(
      targetStatus === "Draft"
        ? "Draft saved successfully"
        : "Operation saved successfully",
    );

    if (shouldRedirect) {
      await router.push("/operations");
    }
  } catch (err: unknown) {
    toast.error(getErrorMessage(err, "Failed to save operation"));
  } finally {
    submitting.value = false;
  }
};
</script>
<template>
  <div class="min-h-screen bg-gray-50">
    <div class="mx-auto p-8">
      <Card class="mb-8 border border-gray-200 shadow-sm">
        <CardContent class="p-6">
          <div class="grid grid-cols-3 gap-6">
            <div class="space-y-6">
              <div class="space-y-2">
                <Label class="text-sm font-medium text-gray-900">Type</Label>
                <Select v-model="formData.type">
                  <SelectTrigger class="bg-gray-50 w-full border-gray-200">
                    <SelectValue placeholder="Operation Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="operationType in OPERATION_TYPE_OPTIONS"
                      :key="operationType.value"
                      :value="operationType.value"
                    >
                      {{ operationType.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <Label class="text-sm font-medium text-gray-900">Company</Label>
                <Input
                  v-model="formData.company"
                  placeholder="Enter company name"
                  class="bg-gray-50 border-gray-200"
                />
              </div>

              <div class="space-y-2">
                <Label class="text-sm font-medium text-gray-900"
                  >Vessel name</Label
                >
                <Input
                  v-model="formData.vesselName"
                  placeholder="Enter vessel name"
                  class="bg-gray-50 border-gray-200"
                />
              </div>
            </div>

            <div class="space-y-6">
              <div class="space-y-2">
                <Label class="text-sm font-medium text-gray-900"
                  >Location</Label
                >
                <Input
                  v-model="formData.location"
                  placeholder="Enter location name"
                  class="bg-gray-50 border-gray-200"
                />
              </div>

              <div class="space-y-2">
                <Label class="text-sm font-medium text-gray-900">Date</Label>
                <Popover v-model:open="isDateOpen">
                  <PopoverTrigger as-child>
                    <Button
                      variant="outline"
                      class="w-full justify-start text-left font-normal bg-gray-50 border-gray-200 hover:bg-gray-100"
                    >
                      <span
                        :class="
                          formData.date ? 'text-gray-900' : 'text-gray-400'
                        "
                      >
                        {{ formatDate(formData.date) }}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent class="w-auto p-0" align="start">
                    <Calendar v-model="calendarDate" />
                    <div class="p-3 border-t border-gray-100">
                      <Button
                        size="sm"
                        class="w-full bg-slate-900 text-white hover:bg-slate-800 h-8"
                        @click="isDateOpen = false"
                      >
                        Confirm Date
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div class="space-y-6">
              <div class="space-y-2">
                <Label class="text-sm font-medium text-gray-900"
                  >Supervisor</Label
                >
                <Select v-model="formData.supervisorId">
                  <SelectTrigger class="bg-gray-50 w-full border-gray-200">
                    <div class="flex items-center gap-2 w-full">
                      <SelectValue placeholder="Choose a supervisor" />
                    </div>
                    <User class="h-4 w-4 text-gray-400 pointer-events-none" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="staff in supervisors"
                      :key="staff.id"
                      :value="staff.id"
                    >
                      {{ staff.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <Label class="text-sm font-medium text-gray-900">Staff</Label>
                <Popover v-model:open="isStaffOpen">
                  <PopoverTrigger as-child>
                    <Button
                      variant="outline"
                      class="w-full justify-between text-left font-normal bg-gray-50 border-gray-200 hover:bg-gray-100 h-auto min-h-[42px] px-3 py-2"
                    >
                      <div class="flex flex-wrap gap-1.5 flex-1">
                        <template v-if="formData.staffIds.length > 0">
                          <Badge
                            v-for="id in formData.staffIds"
                            :key="id"
                            variant="secondary"
                            class="pl-2 pr-1 h-6 bg-gray-200 border border-gray-400 text-primary hover:bg-gray-300 flex items-center gap-1.5"
                          >
                            <User class="h-3 w-3 text-gray-600" />
                            <span class="text-xs font-medium">{{
                              staffNameById.get(id) || "Unknown"
                            }}</span>
                            <button
                              @click.stop="removeStaffById(id)"
                              class="rounded-full"
                            >
                              <X class="h-3 w-3" />
                            </button>
                          </Badge>
                        </template>
                        <span v-else class="text-gray-400 text-sm"
                          >Choose staff</span
                        >
                      </div>
                      <Users class="h-4 w-4 text-gray-400 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent class="w-80" align="start">
                    <div class="space-y-1">
                      <div class="px-2 py-1.5">
                        <p class="text-sm font-medium text-gray-900">
                          Select Staff Members
                        </p>
                        <p class="text-xs text-gray-500 mt-0.5">
                          {{ formData.staffIds.length }} selected
                        </p>
                      </div>
                      <div class="max-h-60 overflow-y-auto px-1 space-y-1">
                        <div
                          v-for="staff in availableStaff"
                          :key="staff.id"
                          class="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          <Checkbox
                            :id="`staff-${staff.id}`"
                            :checked="formData.staffIds.includes(staff.id)"
                            @click="() => toggleStaff(staff.id)"
                          />
                          <Label
                            :for="`staff-${staff.id}`"
                            class="text-sm font-normal cursor-pointer flex-1 flex items-center gap-2"
                          >
                            <User class="h-4 w-4 text-gray-400" />
                            {{ staff.name }}
                          </Label>
                        </div>
                        <div
                          v-if="availableStaff.length === 0"
                          class="text-center py-6 text-gray-500"
                        >
                          <Users class="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p class="text-sm">No staff available</p>
                        </div>
                      </div>
                    </div>
                    <div class="pt-3 mt-3 border-t border-gray-100 px-2">
                      <Button
                        size="sm"
                        class="w-full bg-slate-900 text-white hover:bg-slate-800 h-9"
                        @click="isStaffOpen = false"
                      >
                        Done ({{ formData.staffIds.length }} selected)
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <div class="flex justify-end">
            <Button
              @click="() => handleSubmit('Draft', false)"
              :disabled="!isBasicInfoValid || submitting"
              class="bg-slate-900 hover:bg-slate-800 text-white px-8"
            >
              {{ submitting ? "Saving..." : "Save" }}
            </Button>
          </div>
        </CardContent>
      </Card>
      <div
        class="grid grid-cols-[400px_1fr] gap-6 transition-all duration-200"
        :class="{ 'opacity-50 pointer-events-none blur-sm': !isOperationSaved }"
      >
        <div>
          <Card class="shadow-sm">
            <CardContent class="p-6">
              <div class="grid grid-cols-2 gap-2 mb-6">
                <h2 class="text-2xl font-semibold text-gray-900">Checklist</h2>
                <div class="flex align-items-end rounded-md mb-2 p-2 bg-white">
                  <button
                    @click="checklistView = 'tools'"
                    :class="[
                      'flex-1 py-2 text-sm font-medium transition-colors rounded',
                      checklistView === 'tools'
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:text-gray-900',
                    ]"
                  >
                    Tools
                  </button>
                  <button
                    @click="checklistView = 'operation'"
                    :class="[
                      'flex-1 py-2 text-sm font-medium transition-colors rounded',
                      checklistView === 'operation'
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:text-gray-900',
                    ]"
                  >
                    Operation
                  </button>
                </div>
              </div>
              <div v-if="checklistView === 'tools'" class="space-y-2 mb-6">
                <button
                  class="w-full flex items-center justify-between p-3 rounded-md bg-blue-50 text-gray-900 font-medium"
                >
                  <span class="text-sm">Tools</span>
                  <ChevronRight class="h-4 w-4 text-gray-400" />
                </button>
              </div>
              <div v-if="checklistView === 'operation'" class="space-y-2 mb-6">
                <button
                  v-for="(section, index) in sectionsList"
                  :key="index"
                  @click="selectSection(index)"
                  :class="[
                    'w-full flex items-center justify-between p-3 rounded-md transition-colors text-left',
                    selectedSection === index
                      ? 'bg-blue-50 text-gray-900 font-medium'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100',
                  ]"
                >
                  <span class="text-sm">{{ section.name || "Section" }}</span>
                  <ChevronRight class="h-4 w-4 text-gray-400" />
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  @click="addSection"
                  class="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  <Plus class="h-4 w-4 mr-2" />
                  Add new section
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card
            v-if="checklistView === 'tools'"
            class="border border-gray-200 shadow-sm"
          >
            <CardContent class="p-8">
              <h2 class="text-xl font-semibold mb-6 text-gray-900">Tools</h2>

              <div class="space-y-6">
                <div
                  v-for="(tool, index) in toolsList"
                  :key="index"
                  class="space-y-4"
                >
                  <div class="flex items-center gap-4">
                    <Select v-model="tool.toolId">
                      <SelectTrigger class="flex-1 bg-gray-50 border-gray-200">
                        <SelectValue placeholder="Select tool" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="toolOption in toolOptions"
                          :key="toolOption.id"
                          :value="toolOption.id"
                        >
                          {{ toolOption.name }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div class="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        class="h-9 w-9"
                        @click="decrementQuantity(index)"
                      >
                        <Minus class="h-4 w-4" />
                      </Button>
                      <span class="text-sm font-medium w-8 text-center">{{
                        tool.quantity
                      }}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        class="h-9 w-9"
                        @click="incrementQuantity(index)"
                      >
                        <Plus class="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        @click="removeTool(index)"
                        class="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 class="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  @click="addTool"
                  class="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  <Plus class="h-4 w-4 mr-2" />
                  Add new tool
                </Button>
              </div>
              <div class="flex justify-end mt-8">
                <Button
                  @click="() => handleSubmit('Draft', false)"
                  :disabled="submitting"
                  class="bg-slate-900 hover:bg-slate-800 text-white px-8"
                >
                  {{ submitting ? "Saving..." : "Save Checklist" }}
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card
            v-if="checklistView === 'operation' && selectedSection !== null"
            class="border border-gray-200 shadow-sm"
          >
            <CardContent class="p-8">
              <div class="space-y-6">
                <div class="space-y-2">
                  <Label class="text-sm font-medium text-gray-900"
                    >Section</Label
                  >
                  <Input
                    :model-value="
                      selectedSection !== null
                        ? sectionsList[selectedSection].name
                        : ''
                    "
                    @update:model-value="
                      (val) => {
                        if (selectedSection !== null)
                          sectionsList[selectedSection].name = val;
                      }
                    "
                    placeholder="Section name"
                    class="bg-gray-50 border-gray-200"
                  />
                </div>

                <div class="space-y-6">
                  <div class="flex items-center justify-between">
                    <Label class="text-sm font-medium text-gray-900"
                      >Activities</Label
                    >
                  </div>

                  <div class="space-y-8">
                    <div
                      v-for="(module, moduleIndex) in sectionsList[
                        selectedSection!
                      ]?.modules || []"
                      :key="moduleIndex"
                      class="space-y-4"
                    >
                      <div
                        v-if="
                          (sectionsList[selectedSection!]?.modules.length ||
                            0) > 1
                        "
                        class="flex items-center justify-between"
                      >
                        <h4 class="text-sm font-medium text-gray-500">
                          {{ module.name || `Module ${moduleIndex + 1}` }}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          @click="removeModule(selectedSection!, moduleIndex)"
                          class="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                        >
                          <Trash2 class="h-4 w-4 mr-2" />
                          Delete Module
                        </Button>
                      </div>

                      <div class="space-y-4">
                        <div
                          v-for="(activity, activityIndex) in module.activities"
                          :key="activityIndex"
                          class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-4"
                        >
                          <Textarea
                            v-model="activity.description"
                            placeholder="Enter activity description"
                            class="min-h-[80px] bg-white border-gray-200 resize-none focus-visible:ring-offset-0 focus-visible:ring-1"
                          />
                          <div class="flex items-center justify-between pt-2">
                            <div class="flex items-center space-x-3">
                              <Switch
                                :id="`switch-${selectedSection}-${moduleIndex}-${activityIndex}`"
                                v-model:checked="activity.documentationRequired"
                              />
                              <Label
                                :for="`switch-${selectedSection}-${moduleIndex}-${activityIndex}`"
                                class="text-sm text-gray-700 cursor-pointer font-normal"
                              >
                                Documentation required
                              </Label>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              @click="
                                removeActivity(
                                  selectedSection!,
                                  moduleIndex,
                                  activityIndex,
                                )
                              "
                              class="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2 font-medium"
                            >
                              <Trash2 class="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          @click="addActivity(selectedSection!, moduleIndex)"
                          class="w-full justify-between text-gray-500 bg-white border-gray-200 hover:bg-gray-50 h-11"
                        >
                          <span>Add new activity</span>
                          <Plus class="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div
                      v-if="
                        (sectionsList[selectedSection!]?.modules.length ||
                          0) === 0
                      "
                      class="text-center py-8"
                    >
                      <Button
                        @click="addModule(selectedSection!)"
                        variant="outline"
                      >
                        Add Module for Activities
                      </Button>
                    </div>
                  </div>
                </div>

                <div
                  class="flex justify-end mt-4 pt-4 border-t border-gray-100/50"
                >
                  <Button
                    @click="() => handleSubmit('Draft', false)"
                    :disabled="submitting"
                    class="bg-slate-900 hover:bg-slate-800 text-white px-8 h-9"
                  >
                    {{ submitting ? "Saving..." : "Save" }}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div class="flex justify-end gap-4 mt-8">
        <Button
          variant="outline"
          @click="() => handleSubmit('Draft', true)"
          :disabled="!isBasicInfoValid || submitting"
          class="border-gray-300 px-8"
        >
          {{ submitting ? "Saving..." : "Save draft" }}
        </Button>
        <Button
          @click="() => handleSubmit('Active', true)"
          :disabled="!isBasicInfoValid || submitting"
          class="bg-slate-900 hover:bg-slate-800 text-white px-8"
        >
          {{ submitting ? "Saving..." : "Save" }}
        </Button>
      </div>
    </div>
  </div>
</template>
