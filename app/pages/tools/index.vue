<script lang="ts" setup>
import { ref, computed, watch, onScopeDispose } from "vue";
import { toast } from "vue-sonner";
import { Search, Plus, MoreVertical, Pencil, Trash2 } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DeleteConfirmDialog from "@/components/DeleteConfimDialog.vue";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Label } from "@/components/ui/label";
import type { Tool, ToolForm } from "../../../shared/types/tool";
import { z } from "zod";

const route = useRoute();
const router = useRouter();

const itemsPerPage = 10;

const searchQuery = ref(((route.query.search as string) || "") ?? "");
const currentPage = ref(Number(route.query.page) || 1);

const isDialogOpen = ref(false);
const isEditing = ref(false);
const currentToolId = ref<number | null>(null);
const toolForm = ref<ToolForm>({ name: "" });

// Form validation
const fieldErrors = ref<Record<string, string>>({});

const toolFormSchema = z.object({
  name: z
    .string()
    .min(1, "Tool name is required")
    .max(50, "Tool name must be at most 50 characters long")
    .trim(),
});

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
  },
  { immediate: true },
);

const updateURL = () => {
  const newQuery: Record<string, string | undefined> = {
    search: searchQuery.value || undefined,
    page: currentPage.value > 1 ? String(currentPage.value) : undefined,
  };

  const currentQuery = route.query;
  const hasChanged =
    newQuery.search !== ((currentQuery.search as string) || undefined) ||
    newQuery.page !== ((currentQuery.page as string) || undefined);

  if (hasChanged) {
    router.push({ query: { ...currentQuery, ...newQuery } });
  }
};

const { data, pending, error, refresh } = await useFetch<{
  tools: Tool[];
  total: number;
}>("/api/tools", {
  query: computed(() => ({
    page: route.query.page || 1,
    limit: itemsPerPage,
    search: route.query.search || undefined,
  })),
});

const tools = computed(() => data.value?.tools || []);
const totalTools = computed(() => data.value?.total || 0);

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

const openDialog = (tool?: Tool) => {
  // Reset validation errors
  fieldErrors.value = {};

  if (tool) {
    isEditing.value = true;
    currentToolId.value = tool.id;
    toolForm.value = { name: tool.name };
  } else {
    isEditing.value = false;
    currentToolId.value = null;
    toolForm.value = { name: "" };
  }
  isDialogOpen.value = true;
};

const handleSubmit = async () => {
  // Reset errors
  fieldErrors.value = {};

  // Client-side validation
  const validation = toolFormSchema.safeParse(toolForm.value);

  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    fieldErrors.value = {
      name: errors.name?.[0] || "",
    };
    toast.error("Please fix the validation errors");
    return;
  }

  try {
    if (isEditing.value && currentToolId.value) {
      await $fetch(`/api/tools/${currentToolId.value}`, {
        method: "PUT",
        body: validation.data,
      });
      toast.success("Tool updated successfully");
    } else {
      await $fetch("/api/tools", {
        method: "POST",
        body: validation.data,
      });
      toast.success("Tool created successfully");
    }
    await refresh();
    isDialogOpen.value = false;
  } catch (error: any) {
    // Handle server-side validation errors
    if (error.data?.data) {
      fieldErrors.value = error.data.data;
      toast.error(error.data.message || "Validation failed");
    } else {
      toast.error(error.data?.message || "Failed to save tool");
    }
  }
};

const isDeleteDialogOpen = ref(false);
const toolToDelete = ref<number | null>(null);

const openDeleteDialog = (id: number) => {
  toolToDelete.value = id;
  isDeleteDialogOpen.value = true;
};

const confirmDelete = async () => {
  if (!toolToDelete.value) return;

  try {
    await $fetch(`/api/tools/${toolToDelete.value}`, {
      method: "DELETE",
    });
    toast.success("Tool deleted successfully");
    await refresh();
  } catch (error: any) {
    toast.error(error?.data?.message || "Failed to delete tool");
  } finally {
    isDeleteDialogOpen.value = false;
    toolToDelete.value = null;
  }
};
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <!-- Header Section -->
    <div class="mb-8 flex min-w-0 items-center gap-3">
      <h1
        class="hidden shrink-0 text-xl font-bold tracking-tight text-slate-900 lg:block lg:text-2xl"
      >
        Manage Tools
      </h1>

      <div class="flex min-w-0 w-full flex-1 items-center gap-2 lg:ml-auto lg:max-w-[460px]">
        <!-- Search Input -->
        <div class="relative min-w-0 flex-1">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
          />
          <Input
            v-model="searchQuery"
            placeholder="Search"
            aria-label="Search tools"
            name="search"
            autocomplete="off"
            class="h-10 w-full rounded-md border-gray-300 bg-white pl-10 focus-visible:ring-gray-400"
          />
        </div>

        <!-- New Button -->
        <Button
          @click="openDialog()"
          class="h-10 shrink-0 rounded-md px-4 font-medium text-white hover:bg-gray-500 lg:px-6"
        >
          + New
        </Button>
      </div>
    </div>

    <div v-if="pending">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else>
      <Table class="shadow-md bg-white rounded-md">
        <TableCaption>List of Tools</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead class="w-auto">No</TableHead>
            <TableHead class="w-auto">Tool Name</TableHead>
            <TableHead class="w-auto text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="tools.length === 0">
            <TableCell colspan="3" class="text-center text-slate-500 py-8">
              No tools found
            </TableCell>
          </TableRow>
          <TableRow v-for="(tool, index) in tools" :key="tool.id">
            <TableCell>{{
              (currentPage - 1) * itemsPerPage + index + 1
            }}</TableCell>
            <TableCell>{{ tool.name }}</TableCell>
            <TableCell class="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="ghost" size="icon">
                    <MoreVertical class="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-48">
                  <DropdownMenuItem
                    @click="openDialog(tool)"
                    class="cursor-pointer"
                  >
                    <Pencil class="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    @click="openDeleteDialog(tool.id)"
                    class="text-red-600 cursor-pointer"
                  >
                    <Trash2 class="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <DeleteConfirmDialog
        v-model:open="isDeleteDialogOpen"
        title="Delete Tool?"
        description="This tool will be permanently deleted. This action cannot be undone."
        @confirm="confirmDelete"
      />

      <Pagination
        v-model:page="currentPage"
        :total="totalTools"
        :items-per-page="itemsPerPage"
        :sibling-count="1"
        show-edges
        as-child
      >
        <PaginationContent
          v-slot="{ items }"
          class="flex items-center justify-center mt-4 space-x-2"
        >
          <template v-for="(item, index) in items">
            <PaginationItem
              v-if="item.type === 'page'"
              :key="index"
              :value="item.value"
              as-child
            >
              <Button
                class="w-10 h-10 p-0"
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

    <!-- Dialog -->
    <Dialog v-model:open="isDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{
            isEditing ? "Edit Tool" : "Add New Tool"
          }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div>
            <Label for="tool-name" class="block text-sm font-medium mb-2">
              Tool Name <span class="text-red-500">*</span>
            </Label>
            <Input
              id="tool-name"
              v-model="toolForm.name"
              placeholder="Enter tool name"
              :class="{
                'border-red-500 focus-visible:ring-red-500': fieldErrors.name,
              }"
              maxlength="50"
            />
            <p v-if="fieldErrors.name" class="text-red-500 text-sm mt-1">
              {{ fieldErrors.name }}
            </p>
            <p class="text-gray-500 text-xs mt-1">
              {{ toolForm.name.length }}/50 characters
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="isDialogOpen = false"
            >Cancel</Button
          >
          <Button @click="handleSubmit">{{
            isEditing ? "Update" : "Create"
          }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
