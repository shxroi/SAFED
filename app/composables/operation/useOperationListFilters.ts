import { OPERATION_TYPE_OPTIONS } from "@/constants/operation";
import type { OperationType } from "../../../shared/types/operation";

const operationTypeValues = new Set(
  OPERATION_TYPE_OPTIONS.map((option) => option.value),
);

const parseOperationType = (value: unknown): OperationType | "ALL" => {
  if (typeof value !== "string") return "ALL";
  return operationTypeValues.has(value as OperationType)
    ? (value as OperationType)
    : "ALL";
};

export const useOperationListFilters = () => {
  const route = useRoute();
  const router = useRouter();

  const searchQuery = ref((route.query.search as string) || "");
  const selectedType = ref<OperationType | "ALL">(
    parseOperationType(route.query.type),
  );
  const selectedDate = ref((route.query.date as string) || "");
  const currentPage = ref(Number(route.query.page) || 1);
  const showMyOperationsOnly = ref(route.query.my === "true");

  const syncFromQuery = () => {
    searchQuery.value = (route.query.search as string) || "";
    selectedType.value = parseOperationType(route.query.type);
    selectedDate.value = (route.query.date as string) || "";
    currentPage.value = Number(route.query.page) || 1;
    showMyOperationsOnly.value = route.query.my === "true";
  };

  watch(() => route.query, syncFromQuery, { immediate: true });

  const pushQuery = () => {
    const nextQuery: Record<string, string | undefined> = {
      search: searchQuery.value || undefined,
      type: selectedType.value === "ALL" ? undefined : selectedType.value,
      date: selectedDate.value || undefined,
      page: currentPage.value > 1 ? String(currentPage.value) : undefined,
      my: showMyOperationsOnly.value ? "true" : undefined,
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

  watch([selectedType, selectedDate, showMyOperationsOnly], () => {
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
    selectedType,
    selectedDate,
    currentPage,
    showMyOperationsOnly,
    pushQuery,
  };
};
