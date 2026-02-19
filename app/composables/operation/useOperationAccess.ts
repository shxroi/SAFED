import type { Ref } from "vue";
import type { Operation, OperationRole } from "../../../shared/types/operation";

interface SessionUser {
  id?: number | string;
  roles?: string;
}

export const useOperationAccess = (
  operation: Ref<Operation | null>,
  sessionUser: Ref<SessionUser | null | undefined>,
) => {
  const isIM = computed(() => sessionUser.value?.roles === "IM");
  const isObserver = computed(() => sessionUser.value?.roles === "OBSERVER");

  const enrollment = computed(() => {
    const userId = Number(sessionUser.value?.id);
    if (!operation.value?.enrollments || Number.isNaN(userId)) {
      return null;
    }

    return (
      operation.value.enrollments.find((item) => item.userId === userId) ?? null
    );
  });

  const isUserEnrolled = computed(() => !!enrollment.value);
  const userRole = computed<OperationRole | null>(
    () => enrollment.value?.operationRole ?? null,
  );
  const isSupervisor = computed(() => userRole.value === "SUPERVISOR");
  const isOperationActive = computed(
    () => operation.value?.status === "Active",
  );

  const canAccess = computed(() => {
    return isUserEnrolled.value || isIM.value || isObserver.value;
  });

  const isReadOnly = computed(() => {
    if (!operation.value) return true;

    const isViewerOnlyAccess =
      !isUserEnrolled.value && (isIM.value || isObserver.value);

    return !isOperationActive.value || isObserver.value || isViewerOnlyAccess;
  });

  return {
    isIM,
    isObserver,
    isUserEnrolled,
    userRole,
    isSupervisor,
    canAccess,
    isReadOnly,
  };
};
