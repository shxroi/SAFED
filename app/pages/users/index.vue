<script lang="ts" setup>
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash, MoreVertical, Filter, Search } from "lucide-vue-next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import UserFormDialog from "~/components/UserFormDialog.vue";
import DeleteConfirmDialog from "~/components/DeleteConfimDialog.vue";
import type { User } from "../../../shared/types/user";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

const route = useRoute();
const router = useRouter();
const { updateStatus, deleteUser } = useUsers();

const itemsPerPage = 10;
const tableColumnCount = 7;
const skeletonRowCount = 6;

const roleOptions = [
  { value: "IM", label: "IM" },
  { value: "OBSERVER", label: "Observer" },
  { value: "STAFF", label: "Staff" },
] as const;

type UserRoleFilter = (typeof roleOptions)[number]["value"];
const roleValues = roleOptions.map((role) => role.value);

const parseRolesFromQuery = (queryRoles: unknown): UserRoleFilter[] => {
  if (typeof queryRoles !== "string" || !queryRoles) return [];

  return queryRoles
    .split(",")
    .map((role) => role.trim())
    .filter((role): role is UserRoleFilter =>
      roleValues.includes(role as UserRoleFilter),
    );
};

const parseStatusesFromQuery = (queryStatus: unknown): boolean[] => {
  if (typeof queryStatus !== "string" || !queryStatus) return [];

  return queryStatus
    .split(",")
    .filter((status) => status === "true" || status === "false")
    .map((status) => status === "true");
};

const searchQuery = ref((route.query.search as string) || "");
const currentPage = ref(Number(route.query.page) || 1);
const activeRoles = ref<UserRoleFilter[]>(
  parseRolesFromQuery(route.query.roles),
);
const activeStatuses = ref<boolean[]>(
  parseStatusesFromQuery(route.query.status),
);

const selectedRoles = ref<UserRoleFilter[]>([...activeRoles.value]);
const selectedStatuses = ref<boolean[]>([...activeStatuses.value]);
const filterPopoverOpen = ref(false);

watch(
  () => route.query,
  (newQuery) => {
    const newSearch = (newQuery.search as string) || "";
    if (searchQuery.value !== newSearch) {
      searchQuery.value = newSearch;
    }

    const newPage = Number(newQuery.page) || 1;
    if (currentPage.value !== newPage) {
      currentPage.value = newPage;
    }

    const newRoles = parseRolesFromQuery(newQuery.roles);
    if (JSON.stringify(activeRoles.value) !== JSON.stringify(newRoles)) {
      activeRoles.value = newRoles;
      selectedRoles.value = [...newRoles];
    }

    const newStatuses = parseStatusesFromQuery(newQuery.status);
    if (JSON.stringify(activeStatuses.value) !== JSON.stringify(newStatuses)) {
      activeStatuses.value = newStatuses;
      selectedStatuses.value = [...newStatuses];
    }
  },
  { immediate: true },
);

const updateURL = () => {
  const newQuery: Record<string, string | undefined> = {
    search: searchQuery.value || undefined,
    page: currentPage.value > 1 ? String(currentPage.value) : undefined,
    roles:
      activeRoles.value.length > 0 ? activeRoles.value.join(",") : undefined,
    status:
      activeStatuses.value.length > 0
        ? activeStatuses.value.join(",")
        : undefined,
  };

  const currentQuery = route.query;
  const hasChanged =
    newQuery.search !== (currentQuery.search || undefined) ||
    newQuery.page !== (currentQuery.page || undefined) ||
    newQuery.roles !== (currentQuery.roles || undefined) ||
    newQuery.status !== (currentQuery.status || undefined);

  if (hasChanged) {
    router.replace({ query: newQuery });
  }
};

const { data, pending, error, refresh } = await useFetch<{
  users: User[];
  total: number;
}>("/api/users", {
  query: computed(() => ({
    page: route.query.page || 1,
    limit: itemsPerPage,
    search: route.query.search || undefined,
    roles: route.query.roles || undefined,
    status: route.query.status || undefined,
  })),
});

const users = computed(() => data.value?.users || []);
const totalItems = computed(() => data.value?.total || 0);

const roleLabelMap: Record<UserRoleFilter, string> = {
  IM: "IM",
  OBSERVER: "Observer",
  STAFF: "Staff",
};

const formatRoleLabel = (role: string): string => {
  return roleLabelMap[role as UserRoleFilter] || role;
};

const getErrorMessage = (requestError: unknown): string => {
  if (
    typeof requestError === "object" &&
    requestError !== null &&
    "message" in requestError &&
    typeof (requestError as { message?: unknown }).message === "string"
  ) {
    return (requestError as { message: string }).message;
  }

  return "Failed to load users";
};

const skeletonWidthClass = (columnIndex: number): string => {
  const widthByColumn = ["w-8", "w-28", "w-24", "w-40", "w-20", "w-16", "w-10"];
  return widthByColumn[columnIndex] || "w-24";
};

const toggleRole = (role: UserRoleFilter, checked: boolean) => {
  if (checked) {
    if (!selectedRoles.value.includes(role)) {
      selectedRoles.value = [...selectedRoles.value, role];
    }
    return;
  }

  selectedRoles.value = selectedRoles.value.filter((item) => item !== role);
};

const toggleStatus = (status: boolean, checked: boolean) => {
  if (checked) {
    if (!selectedStatuses.value.includes(status)) {
      selectedStatuses.value = [...selectedStatuses.value, status];
    }
    return;
  }

  selectedStatuses.value = selectedStatuses.value.filter(
    (item) => item !== status,
  );
};

const handleApplyFilter = () => {
  activeRoles.value = [...selectedRoles.value];
  activeStatuses.value = [...selectedStatuses.value];
  currentPage.value = 1;
  filterPopoverOpen.value = false;
  updateURL();
};

const handleClearFilters = () => {
  selectedRoles.value = [];
  selectedStatuses.value = [];
  activeRoles.value = [];
  activeStatuses.value = [];
  currentPage.value = 1;
  filterPopoverOpen.value = false;
  updateURL();
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
    updateURL();
  }, 300);
});

watch(currentPage, (newPage, oldPage) => {
  if (newPage !== oldPage) {
    updateURL();
  }
});

watch(filterPopoverOpen, (isOpen) => {
  if (isOpen) {
    selectedRoles.value = [...activeRoles.value];
    selectedStatuses.value = [...activeStatuses.value];
  }
});

const handleToggleStatus = async (user: User) => {
  await updateStatus(user.id, !user.isActive);
  await refresh();
};

const dialogOpen = ref(false);
const selectedUser = ref<User | undefined>(undefined);
const deleteDialogOpen = ref(false);
const userIdToDelete = ref<number | null>(null);

const handleEditUser = (user: User) => {
  selectedUser.value = user;
  dialogOpen.value = true;
};

const confirmDelete = async () => {
  if (userIdToDelete.value != null) {
    await deleteUser(userIdToDelete.value);
    await refresh();
    deleteDialogOpen.value = false;
    userIdToDelete.value = null;
  }
};

const activeFilterCount = computed(() => {
  return activeRoles.value.length + activeStatuses.value.length;
});
</script>

<template>
  <div class="relative flex flex-col overflow-x-hidden p-4 sm:p-6 lg:p-8">
    <div class="mb-8 flex min-w-0 items-center gap-3">
      <h1
        class="hidden shrink-0 text-xl font-bold tracking-tight text-slate-900 lg:block lg:text-2xl"
      >
        Manage user
      </h1>

      <div
        class="flex min-w-0 w-full flex-1 items-center gap-2 lg:ml-auto lg:max-w-140"
      >
        <div class="relative min-w-0 flex-1">
          <Search
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          />
          <Input
            v-model="searchQuery"
            placeholder="Search"
            aria-label="Search users"
            name="search"
            autocomplete="off"
            class="h-10 w-full rounded-md border-gray-300 bg-white pl-10 focus-visible:ring-gray-400"
          />
        </div>

        <Popover
          :open="filterPopoverOpen"
          @update:open="filterPopoverOpen = $event"
        >
          <PopoverTrigger as-child>
            <Button
              variant="outline"
              :aria-label="
                activeFilterCount > 0
                  ? `Filter users, ${activeFilterCount} filters active`
                  : 'Filter users'
              "
              class="relative h-10 shrink-0 gap-2 rounded-md border-gray-300 px-3 text-gray-600"
            >
              <Filter class="h-4 w-4 text-gray-500" />
              <span class="font-normal">Filter</span>
              <span
                v-if="activeFilterCount > 0"
                class="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-white"
              >
                {{ activeFilterCount }}
              </span>
            </Button>
          </PopoverTrigger>

          <PopoverContent
            class="w-64 rounded-lg p-4 shadow-md"
            :side-offset="8"
            align="end"
          >
            <div class="space-y-4">
              <div>
                <h4
                  class="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400"
                >
                  Roles
                </h4>
                <div class="space-y-2">
                  <div
                    v-for="role in roleOptions"
                    :key="role.value"
                    class="flex min-h-11 items-center justify-between space-x-2 rounded-md px-2"
                  >
                    <label
                      :for="`role-${role.value}`"
                      class="flex-1 cursor-pointer text-sm font-medium leading-none text-slate-700"
                    >
                      {{ role.label }}
                    </label>
                    <Checkbox
                      :id="`role-${role.value}`"
                      class="size-5"
                      :checked="selectedRoles.includes(role.value)"
                      @update:checked="
                        (value: boolean | string) =>
                          toggleRole(role.value, value === true)
                      "
                    />
                  </div>
                </div>
              </div>

              <Separator class="my-2" />

              <div>
                <h4
                  class="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400"
                >
                  Status
                </h4>
                <div class="space-y-2">
                  <div
                    class="flex min-h-11 items-center justify-between space-x-2 rounded-md px-2"
                  >
                    <label
                      for="status-active"
                      class="flex-1 cursor-pointer text-sm font-medium leading-none text-slate-700"
                      >Active</label
                    >
                    <Checkbox
                      id="status-active"
                      class="size-5"
                      :checked="selectedStatuses.includes(true)"
                      @update:checked="
                        (value: boolean | string) =>
                          toggleStatus(true, value === true)
                      "
                    />
                  </div>
                  <div
                    class="flex min-h-11 items-center justify-between space-x-2 rounded-md px-2"
                  >
                    <label
                      for="status-inactive"
                      class="flex-1 cursor-pointer text-sm font-medium leading-none text-slate-700"
                      >Inactive</label
                    >
                    <Checkbox
                      id="status-inactive"
                      class="size-5"
                      :checked="selectedStatuses.includes(false)"
                      @update:checked="
                        (value: boolean | string) =>
                          toggleStatus(false, value === true)
                      "
                    />
                  </div>
                </div>
              </div>

              <div class="flex gap-2">
                <Button
                  v-if="selectedRoles.length > 0 || selectedStatuses.length > 0"
                  variant="outline"
                  class="min-h-11 flex-1"
                  @click="handleClearFilters"
                >
                  Clear
                </Button>
                <Button
                  class="min-h-11 flex-1 rounded-md bg-secondary text-primary hover:text-white"
                  @click="handleApplyFilter"
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          aria-label="Create new user"
          class="h-10 shrink-0 rounded-md px-4 font-medium text-white hover:bg-gray-500 lg:px-6"
          @click="
            () => {
              selectedUser = undefined;
              dialogOpen = true;
            }
          "
        >
          + New
        </Button>
      </div>
    </div>

    <div
      tabindex="0"
      role="region"
      aria-label="Users management table"
      :aria-busy="pending"
      class="w-full max-w-full overflow-hidden rounded-lg border bg-white shadow-xs"
    >
      <Table class="min-w-215" aria-label="Horizontally scrollable users table">
        <TableCaption>List of Users</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>No</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Username</TableHead>
            <TableHead class="min-w-55">Email</TableHead>
            <TableHead>Role Access</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          <template v-if="pending">
            <TableRow v-for="row in skeletonRowCount" :key="`skeleton-${row}`">
              <TableCell
                v-for="column in tableColumnCount"
                :key="`cell-${row}-${column}`"
              >
                <div
                  class="h-4 animate-pulse rounded bg-gray-200"
                  :class="skeletonWidthClass(column - 1)"
                />
              </TableCell>
            </TableRow>
          </template>

          <TableRow v-else-if="error">
            <TableCell
              :colspan="tableColumnCount"
              class="h-24 text-center text-red-600"
            >
              {{ getErrorMessage(error) }}
            </TableCell>
          </TableRow>

          <TableRow v-else-if="users.length === 0">
            <TableCell
              :colspan="tableColumnCount"
              class="h-24 text-center text-gray-500"
            >
              No users found
            </TableCell>
          </TableRow>

          <TableRow v-for="(user, index) in users" :key="user.id">
            <TableCell>{{
              (currentPage - 1) * itemsPerPage + index + 1
            }}</TableCell>
            <TableCell>{{ user.name }}</TableCell>
            <TableCell class="max-w-40 truncate" :title="user.username">
              {{ user.username }}
            </TableCell>
            <TableCell class="max-w-55 truncate" :title="user.email">
              {{ user.email }}
            </TableCell>
            <TableCell>{{ formatRoleLabel(user.roles) }}</TableCell>
            <TableCell>
              <span
                :class="
                  user.isActive
                    ? 'rounded-sm bg-green-200 px-4 py-1 font-medium text-green-950'
                    : 'rounded-sm bg-red-200 px-3 py-1 font-medium text-red-700'
                "
              >
                {{ user.isActive ? "Active" : "Inactive" }}
              </span>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button
                    variant="ghost"
                    class="h-11 w-11 p-0"
                    :aria-label="`Open actions for ${user.name}`"
                  >
                    <MoreVertical class="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-48">
                  <DropdownMenuLabel class="flex justify-center"
                    >Action</DropdownMenuLabel
                  >
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    class="flex min-h-11 cursor-pointer items-center justify-between"
                    @click="handleEditUser(user)"
                  >
                    <span>Edit</span>
                    <Pencil class="h-4 w-4" />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    class="flex min-h-11 cursor-pointer items-center justify-between"
                    @click.stop="handleToggleStatus(user)"
                  >
                    <span>Status</span>
                    <div
                      :class="[
                        'relative h-4 w-8 rounded-full transition-colors',
                        user.isActive ? 'bg-gray-900' : 'bg-gray-200',
                      ]"
                    >
                      <div
                        :class="[
                          'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all',
                          user.isActive ? 'left-4' : 'left-0.5',
                        ]"
                      />
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    class="flex min-h-11 cursor-pointer items-center justify-between text-red-700"
                    @click="
                      () => {
                        userIdToDelete = user.id;
                        deleteDialogOpen = true;
                      }
                    "
                  >
                    <span>Delete</span>
                    <Trash class="h-4 w-4 text-red-600" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <Pagination
      v-if="!pending && !error && totalItems > itemsPerPage"
      v-model:page="currentPage"
      :total="totalItems"
      :items-per-page="itemsPerPage"
      :sibling-count="1"
      show-edges
      as-child
    >
      <PaginationContent
        v-slot="{ items }"
        class="mt-4 flex flex-wrap items-center justify-center gap-2"
      >
        <template v-for="(item, index) in items">
          <PaginationItem
            v-if="item.type === 'page'"
            :key="index"
            :value="item.value"
            as-child
          >
            <Button
              class="h-11 w-11 p-0"
              :variant="item.value === currentPage ? 'default' : 'ghost'"
            >
              {{ item.value }}
            </Button>
          </PaginationItem>
          <PaginationEllipsis v-else :key="item.type" :index="index" />
        </template>
      </PaginationContent>
    </Pagination>
  </div>

  <DeleteConfirmDialog
    :open="deleteDialogOpen"
    @update:open="deleteDialogOpen = $event"
    @confirm="confirmDelete"
  />

  <UserFormDialog
    :open="dialogOpen"
    :user="selectedUser || undefined"
    @update:open="dialogOpen = $event"
    @submit="refresh()"
  />
</template>
