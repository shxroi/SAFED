import { computed, ref, watch } from "vue";
import { CalendarDate } from "@internationalized/date";
import type { OperationType } from "../../../shared/types/operation";

interface StaffMember {
  id: number;
  name: string;
}

interface ToolOption {
  id: number;
  name: string;
}

export const useOperationForm = () => {
  const formData = ref({
    type: "" as OperationType | "",
    company: "",
    vesselName: "",
    location: "",
    date: null as Date | null,
    supervisorId: null as number | null,
    staffIds: [] as number[],
  });

  const isStaffOpen = ref(false);
  const isDateOpen = ref(false);

  const { data: staffData } = useFetch<{ users: StaffMember[] }>("/api/users", {
    query: { roles: "STAFF" },
  });

  const { data: toolsData } = useFetch<{ tools: ToolOption[] }>("/api/tools", {
    query: { page: 1, limit: 200 },
  });

  const staffList = computed(() => staffData.value?.users ?? []);
  const toolOptions = computed(() => toolsData.value?.tools ?? []);
  const supervisors = computed(() => staffList.value);

  const staffNameById = computed(
    () => new Map(staffList.value.map((staff) => [staff.id, staff.name])),
  );

  const availableStaff = computed(() =>
    staffList.value.filter((staff) => staff.id !== formData.value.supervisorId),
  );

  watch(
    () => formData.value.supervisorId,
    (supervisorId) => {
      if (supervisorId === null) return;
      formData.value.staffIds = formData.value.staffIds.filter(
        (id) => id !== supervisorId,
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

  const calendarDateToDate = (value: CalendarDate | undefined): Date | null => {
    if (!value) return null;
    return new Date(value.year, value.month - 1, value.day);
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

  const isBasicInfoValid = computed(
    () =>
      !!(
        formData.value.type &&
        formData.value.company.trim() &&
        formData.value.location.trim() &&
        formData.value.date
      ),
  );

  const toggleStaff = (staffId: number) => {
    const index = formData.value.staffIds.indexOf(staffId);
    if (index > -1) {
      formData.value.staffIds.splice(index, 1);
    } else {
      formData.value.staffIds.push(staffId);
    }
  };

  const removeStaffById = (staffId: number) => {
    formData.value.staffIds = formData.value.staffIds.filter(
      (id) => id !== staffId,
    );
  };

  return {
    formData,
    isStaffOpen,
    isDateOpen,
    staffList,
    toolOptions,
    supervisors,
    staffNameById,
    availableStaff,
    calendarDate,
    formatDate,
    isBasicInfoValid,
    toggleStaff,
    removeStaffById,
  };
};
