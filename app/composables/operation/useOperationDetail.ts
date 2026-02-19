import type { Ref } from "vue";
import type {
  Operation,
  OperationWithDetails,
} from "../../../shared/types/operation";
import type {
  OperationSection,
  OperationTool,
} from "../../../shared/types/operation-execution";

interface OperationDetailResponse {
  operation: OperationWithDetails & {
    date: string;
    createdAt: string;
  };
}

interface OperationChecklistResponse {
  success: boolean;
  tools: OperationTool[];
  sections: OperationSection[];
}

export const useOperationDetail = (operationId: Ref<number>) => {
  const operation = ref<Operation | null>(null);
  const tools = ref<OperationTool[]>([]);
  const sections = ref<OperationSection[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const getErrorMessage = (
    requestError: unknown,
    fallbackMessage: string,
  ): string => {
    if (
      typeof requestError === "object" &&
      requestError !== null &&
      "data" in requestError &&
      typeof (requestError as { data?: { message?: unknown } }).data
        ?.message === "string"
    ) {
      return (requestError as { data: { message: string } }).data.message;
    }

    if (
      typeof requestError === "object" &&
      requestError !== null &&
      "message" in requestError &&
      typeof (requestError as { message?: unknown }).message === "string"
    ) {
      return (requestError as { message: string }).message;
    }

    return fallbackMessage;
  };

  const fetchOperationDetail = async (): Promise<void> => {
    if (Number.isNaN(operationId.value) || operationId.value < 1) {
      throw createError({ statusCode: 400, message: "Invalid operation ID" });
    }

    loading.value = true;
    error.value = null;

    try {
      const [operationResponse, checklistResponse] = await Promise.all([
        $fetch<OperationDetailResponse>(`/api/operations/${operationId.value}`),
        $fetch<OperationChecklistResponse>(
          `/api/operations/${operationId.value}/checklist`,
        ),
      ]);

      const operationData = operationResponse.operation;
      const enrollments = operationData.enrollments ?? [];

      const supervisor = enrollments.find(
        (enrollment) => enrollment.operationRole === "SUPERVISOR",
      );
      const staffMembers = enrollments.filter(
        (enrollment) => enrollment.operationRole === "STAFF",
      );

      operation.value = {
        ...operationData,
        supervisorName: supervisor?.user?.name ?? "Unknown",
        staffNames: staffMembers.map((staff) => staff.user?.name ?? "Unknown"),
      };

      tools.value = checklistResponse.tools ?? [];
      sections.value = (checklistResponse.sections ?? []).map((section) => ({
        ...section,
        isOpen: section.isOpen ?? false,
      }));
    } catch (requestError: unknown) {
      error.value = getErrorMessage(
        requestError,
        "Failed to load operation detail",
      );
      throw requestError;
    } finally {
      loading.value = false;
    }
  };

  return {
    operation,
    tools,
    sections,
    loading,
    error,
    fetchOperationDetail,
  };
};
