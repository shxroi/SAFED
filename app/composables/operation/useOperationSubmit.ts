import type { ComputedRef, Ref } from "vue";
import { ref } from "vue";
import { toast } from "vue-sonner";
import type { OperationType } from "../../../shared/types/operation";
import type {
  ChecklistResponse,
  ChecklistSectionInput,
  ChecklistToolInput,
} from "./useChecklistBuilder";

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

interface FormData {
  type: OperationType | "";
  company: string;
  vesselName: string;
  location: string;
  date: Date | null;
  supervisorId: number | null;
  staffIds: number[];
}

interface UseOperationSubmitOptions {
  operationId: ComputedRef<number | null>;
  isEditing: ComputedRef<boolean>;
  isBasicInfoValid: ComputedRef<boolean>;
  formData: Ref<FormData>;
  sectionsList: Ref<ChecklistSectionInput[]>;
  toolsList: Ref<ChecklistToolInput[]>;
  createEmptySection: () => ChecklistSectionInput;
  mapChecklistSections: (
    sections: ChecklistResponse["sections"],
  ) => ChecklistSectionInput[];
}

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
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
  return fallbackMessage;
};

export const useOperationSubmit = ({
  operationId,
  isEditing,
  isBasicInfoValid,
  formData,
  sectionsList,
  toolsList,
  createEmptySection,
  mapChecklistSections,
}: UseOperationSubmitOptions) => {
  const router = useRouter();
  const route = useRoute();
  const submitting = ref(false);

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
      .map((tool) => ({ toolId: tool.toolId, quantity: tool.quantity }))
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
    const payloadWithStatus = { ...payload, status: nextStatus };

    if (isEditing.value && operationId.value) {
      await $fetch(`/api/operations/${operationId.value}`, {
        method: "PUT",
        body: payloadWithStatus,
      });
      return operationId.value;
    }

    const response = await $fetch<{ operation?: { id: number } }>(
      "/api/operations",
      { method: "POST", body: payloadWithStatus },
    );

    const nextId = response.operation?.id;
    if (!nextId) {
      throw createError({
        statusCode: 500,
        message: "Operation save did not return an ID",
      });
    }

    await router.replace({ query: { ...route.query, id: String(nextId) } });
    return nextId;
  };

  const saveChecklist = async (savedOperationId: number): Promise<void> => {
    const payload = buildChecklistPayload();
    await $fetch(`/api/operations/${savedOperationId}/checklist`, {
      method: "PUT",
      body: payload,
    });
  };

  const loadExistingOperation = async (): Promise<void> => {
    if (!operationId.value) return;

    try {
      const [operationResponse, checklistResponse] = await Promise.all([
        $fetch<OperationDetailResponse>(
          `/api/operations/${operationId.value}`,
        ),
        $fetch<ChecklistResponse>(
          `/api/operations/${operationId.value}/checklist`,
        ),
      ]);

      const { operation } = operationResponse;
      const enrollments = operation.enrollments ?? [];

      formData.value = {
        type: operation.type,
        company: operation.company,
        vesselName: operation.vesselName || "",
        location: operation.location,
        date: new Date(operation.date),
        supervisorId:
          enrollments.find((e) => e.operationRole === "SUPERVISOR")?.userId ||
          null,
        staffIds: enrollments
          .filter((e) => e.operationRole === "STAFF")
          .map((e) => e.userId),
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
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to load operation"));
      await router.push("/operations");
    }
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

  return { submitting, loadExistingOperation, handleSubmit };
};
