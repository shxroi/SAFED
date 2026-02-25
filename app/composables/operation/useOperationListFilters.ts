import {
  OPERATION_STATUS_OPTIONS,
  OPERATION_TYPE_OPTIONS,
} from "@/constants/operation";
import type { OperationStatus, OperationType } from "../../../shared/types/operation";

const operationTypeValues = new Set(
  OPERATION_TYPE_OPTIONS.map((option) => option.value),
);

const operationStatusValues = new Set(
  OPERATION_STATUS_OPTIONS.map((option) => option.value),
);

const parseTypeList = (value: unknown): OperationType[] => {
  if (typeof value !== "string" || value.trim().length === 0) return [];

  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is OperationType =>
      operationTypeValues.has(item as OperationType),
    );

  return [...new Set(parsed)];
};

const parseStatusList = (value: unknown): OperationStatus[] => {
  if (typeof value !== "string" || value.trim().length === 0) return [];

  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is OperationStatus =>
      operationStatusValues.has(item as OperationStatus),
    );

  return [...new Set(parsed)];
};

export const useOperationListFilters = () => {
  const route = useRoute();
  const router = useRouter();

  const searchQuery = ref((route.query.search as string) || "");
  const selectedTypes = ref<OperationType[]>(parseTypeList(route.query.type));
  const selectedDate = ref((route.query.date as string) || "");
  const selectedStatuses = ref<OperationStatus[]>(
    parseStatusList(route.query.status),
  );
  const currentPage = ref(Number(route.query.page) || 1);

  const syncFromQuery = () => {
    searchQuery.value = (route.query.search as string) || "";
    selectedTypes.value = parseTypeList(route.query.type);
    selectedDate.value = (route.query.date as string) || "";
    selectedStatuses.value = parseStatusList(route.query.status);
    currentPage.value = Number(route.query.page) || 1;
  };

  watch(() => route.query, syncFromQuery, { immediate: true });

  const pushQuery = () => {
    const nextQuery: Record<string, string | undefined> = {
      search: searchQuery.value || undefined,
      type:
        selectedTypes.value.length > 0
          ? selectedTypes.value.join(",")
          : undefined,
      date: selectedDate.value || undefined,
      status:
        selectedStatuses.value.length > 0
          ? selectedStatuses.value.join(",")
          : undefined,
      page: currentPage.value > 1 ? String(currentPage.value) : undefined,
    };

    router.replace({ query: nextQuery });
  };

  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  onScopeDispose(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      searchTimeout = null;
    }
  });

  watch(searchQuery, () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage.value = 1;
      pushQuery();
    }, 300);
  });

  watch([selectedTypes, selectedDate, selectedStatuses], () => {
    currentPage.value = 1;
    pushQuery();
  });

  watch(currentPage, (next, prev) => {
    if (next !== prev) {
      pushQuery();
    }
  });

  return {
    searchQuery,
    selectedTypes,
    selectedDate,
    selectedStatuses,
    currentPage,
    pushQuery,
  };
};
