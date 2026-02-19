<script lang="ts" setup>
import type { Operation } from "../../../shared/types/operation";
import { toast } from "vue-sonner";
import { useOperationListFilters } from "~/composables/operation/useOperationListFilters";
import DeleteConfirmDialog from "@/components/DeleteConfimDialog.vue";

const { user } = useAuth();
const userRole = computed(() => user.value?.roles);
const isIM = computed(() => userRole.value === "IM");

const router = useRouter();
const route = useRoute();

// Delete dialog state
const deleteDialogOpen = ref(false);
const operationToDelete = ref<Operation | null>(null);
const deleteAction = ref<"delete" | "cancel">("delete");

const { searchQuery, selectedType, selectedDate, showMyOperationsOnly } =
  useOperationListFilters();

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

const {
  data: operationsData,
  pending,
  error,
  refresh,
} = await useFetch<{ operations: Operation[]; total: number }>(
  "/api/operations",
  {
    query: computed(() => ({
      search: route.query.search || undefined,
      type: route.query.type || undefined,
      date: route.query.date || undefined,
      my: route.query.my || undefined,
    })),
  },
);

const operations = computed(() => {
  return operationsData.value?.operations || [];
});

const statusCounts = computed(() => {
  const list = operations.value;
  return {
    total: list.length,
    active: list.filter((operation) => operation.status === "Active").length,
    draft: list.filter((operation) => operation.status === "Draft").length,
    complete: list.filter((operation) => operation.status === "Complete")
      .length,
  };
});

const getDaysLeft = (dateString: string | null | undefined): number | null => {
  if (!dateString) return null;

  const operationDate = new Date(dateString);
  if (Number.isNaN(operationDate.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  operationDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (operationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diffDays;
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "Invalid date";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const mutateOperation = async (
  id: number,
  options: { method: "PATCH" | "DELETE"; body?: Record<string, unknown> },
  actionName: string,
) => {
  try {
    await $fetch(`/api/operations/${id}`, {
      method: options.method,
      body: options.body,
    });
    await refresh();
  } catch (requestError: unknown) {
    toast.error(
      getErrorMessage(requestError, `Failed to ${actionName} operation`),
    );
    throw requestError;
  }
};

const handleView = (operation: Operation) => {
  router.push(`/operations/${operation.id}/execute`);
};

const handleEdit = (operation: Operation) => {
  router.push(`/operations/create?id=${operation.id}`);
};

const handleDelete = async (operation: Operation) => {
  operationToDelete.value = operation;
  deleteAction.value = "delete";
  deleteDialogOpen.value = true;
};

const handleCancel = async (operation: Operation) => {
  operationToDelete.value = operation;
  deleteAction.value = "cancel";
  deleteDialogOpen.value = true;
};

const handleConfirmDelete = async () => {
  if (!operationToDelete.value) return;

  const operation = operationToDelete.value;

  try {
    if (deleteAction.value === "delete") {
      await mutateOperation(operation.id, { method: "DELETE" }, "deleting");
      toast.success("Operation deleted successfully");
    } else {
      await mutateOperation(
        operation.id,
        { method: "PATCH", body: { status: "Cancelled" } },
        "cancelling",
      );
      toast.success("Operation cancelled successfully");
    }
  } catch (error) {
    // Error already handled in mutateOperation
  } finally {
    deleteDialogOpen.value = false;
    operationToDelete.value = null;
  }
};

const deleteDialogTitle = computed(() => {
  if (!operationToDelete.value) return "";
  return deleteAction.value === "delete" ? "Delete Operation?" : "Cancel Operation?";
});

const deleteDialogDescription = computed(() => {
  if (!operationToDelete.value) return "";
  
  const operationLabel = operationToDelete.value.vesselName
    ? `${operationToDelete.value.vesselName} - ${operationToDelete.value.company}`
    : operationToDelete.value.company;

  if (deleteAction.value === "delete") {
    return `Are you sure you want to delete "${operationLabel}"? This action cannot be undone.`;
  }
  
  return `Are you sure you want to cancel "${operationLabel}"? This will mark the operation as cancelled.`;
});

const handleNewOperation = () => {
  router.push("/operations/create");
};
</script>

<template>
  <div class="p-4 md:p-8">
    <OperationFilters
      v-model:search="searchQuery"
      v-model:type="selectedType"
      v-model:date="selectedDate"
      v-model:my-only="showMyOperationsOnly"
      :is-i-m="isIM"
      @create="handleNewOperation"
    />

    <OperationStats :stats="statusCounts" />

    <div v-if="pending" class="text-center py-12">
      <p class="text-gray-500">Loading operations...</p>
    </div>

    <div v-else-if="error" class="text-center py-12">
      <p class="text-red-500">Failed to load operations</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <OperationCard
        v-for="operation in operations"
        :key="operation.id"
        :operation="operation"
        :is-i-m="isIM"
        :days-left="getDaysLeft(operation.date)"
        :formatted-date="formatDate(operation.date)"
        @view="handleView"
        @edit="handleEdit"
        @delete="handleDelete"
        @cancel="handleCancel"
      />
    </div>

    <div
      v-if="!pending && !error && operations.length === 0"
      class="text-center py-12"
    >
      <p class="text-gray-500">No operations found</p>
      <Button
        v-if="showMyOperationsOnly"
        variant="link"
        @click="showMyOperationsOnly = false"
      >
        Show all operations
      </Button>
    </div>

    <DeleteConfirmDialog
      v-model:open="deleteDialogOpen"
      :title="deleteDialogTitle"
      :description="deleteDialogDescription"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>
