<script setup lang="ts">
import { UserPen, Wrench, LogOut, Menu, Settings2 } from "lucide-vue-next";
import safedLogo from "/images/safedlogo.webp";
import Avatar from "/images/avatar.png";

const route = useRoute();
const { user: authUser, logout } = useAuth();
const mobileNavOpen = ref(false);

const currentPage = computed(() => {
  if (route.path === "/users") return "Manage Users";
  if (route.path === "/tools") return "Manage Tools";
  if (route.path === "/operations") return "Operations List";
  if (route.path === "/operations/create") return "Create Operation";
  if (route.path.match(/\/operations\/\d+\/report/)) return "Operation Report";
  if (route.path.match(/\/operations\/\d+\/execute/))
    return "Execute Operation";
  if (route.path.match(/\/operations\/\d+/)) return "Operation Detail";

  const name = route.name?.toString() || "Dashboard";
  return name.charAt(0).toUpperCase() + name.slice(1);
});

const mobilePageTitle = computed(() => {
  if (route.path === "/users") return "Manage Users";
  if (route.path === "/tools") return "Manage Tools";
  if (route.path === "/operations") return "Operations List";
  if (route.path === "/operations/create") return "Create Operation";
  if (route.path.match(/\/operations\/\d+\/report/)) return "Operation Report";
  if (route.path.match(/\/operations\/\d+\/execute/))
    return "Execute Operation";
  if (route.path.match(/\/operations\/\d+/)) return "Operation Detail";

  return currentPage.value !== "Dashboard" ? currentPage.value : "SAFED";
});

const navigationItems = computed(() => {
  if (authUser.value?.roles === "IM") {
    return [
      { to: "/operations", label: "Manage Operations", icon: Settings2 },
      { to: "/users", label: "Users Management", icon: UserPen },
      { to: "/tools", label: "Tools Management", icon: Wrench },
    ];
  }

  if (authUser.value?.roles === "OBSERVER") {
    return [{ to: "/observer", label: "Operations", icon: Settings2 }];
  }

  return [{ to: "/operations", label: "Operations", icon: Settings2 }];
});

const closeMobileNav = (): void => {
  mobileNavOpen.value = false;
};

const handleLogout = async () => {
  try {
    closeMobileNav();
    await logout();
  } catch (error) {
    console.error("Logout failed:", error);
  }
};

watch(
  () => route.fullPath,
  () => {
    closeMobileNav();
  },
);
</script>

<template>
  <div class="flex min-h-screen bg-slate-50 font-sans">
    <!-- Sidebar -->
    <aside
      class="hidden md:flex w-64 flex-col bg-white border-r border-slate-200"
    >
      <div class="p-6 border-b border-slate-100 flex items-center gap-2">
        <NuxtImg
          :src="safedLogo"
          alt="SAFED logo"
          loading="eager"
          fetch-priority="high"
          class="h-8 w-auto"
        />
      </div>

      <nav class="flex-1 p-4 space-y-2">
        <NuxtLink
          v-for="item in navigationItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-all duration-200 group"
          active-class="bg-slate-900 text-white shadow-sm"
        >
          <component :is="item.icon" class="w-5 h-5" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>
    </aside>

    <!-- Main Content Area -->
    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Top Header -->
      <header
        class="sticky top-0 z-99 flex h-16 w-full items-center justify-between border-b border-slate-100 bg-white px-4 md:px-8"
      >
        <div class="flex items-center gap-3">
          <button
            class="md:hidden text-slate-600 focus:outline-none"
            type="button"
            aria-label="Open navigation menu"
            @click="mobileNavOpen = true"
          >
            <Menu class="w-6 h-6" />
          </button>
          <!-- Desktop Breadcrumb -->
          <div class="hidden md:block text-sm text-slate-400">
            <template v-if="route.path.match(/\/operations\/\d+\/report/)">
              <NuxtLink to="/operations" class="hover:text-slate-600"
                >Operations</NuxtLink
              >
              / <span class="text-slate-900 font-medium">Operation Report</span>
            </template>
            <template
              v-else-if="route.path.match(/\/operations\/\d+\/execute/)"
            >
              <NuxtLink to="/operations" class="hover:text-slate-600"
                >Operations</NuxtLink
              >
              /
              <span class="text-slate-900 font-medium">Execute Operation</span>
            </template>
            <template v-else-if="route.path.match(/\/operations\/\d+/)">
              <NuxtLink to="/operations" class="hover:text-slate-600"
                >Operations</NuxtLink
              >
              / <span class="text-slate-900 font-medium">Operation Detail</span>
            </template>
            <template v-else-if="route.path === '/operations/create'">
              <NuxtLink to="/operations" class="hover:text-slate-600"
                >Operations</NuxtLink
              >
              / <span class="text-slate-900 font-medium">Create Operation</span>
            </template>
            <template v-else>
              Pages /
              <span class="text-slate-900 font-medium">{{ currentPage }}</span>
            </template>
          </div>
        </div>

        <h1
          class="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold text-slate-900 md:hidden"
        >
          {{ mobilePageTitle }}
        </h1>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <div
              class="h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-200 shadow-sm transition-all hover:ring-2 hover:ring-slate-100 md:h-10 md:w-10"
            >
              <NuxtImg
                :src="Avatar"
                alt="User avatar"
                width="40"
                height="40"
                loading="lazy"
                class="w-full h-full object-cover"
              />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-52 mt-2">
            <DropdownMenuLabel>
              <div class="flex flex-col space-y-1">
                <p class="text-sm font-medium text-slate-900">
                  {{ authUser?.name }}
                </p>
                <p class="text-xs text-slate-500">{{ authUser?.email }}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              @click="handleLogout"
              class="text-red-600 focus:text-red-800 cursor-pointer"
            >
              <LogOut class="w-4 h-4 mr-2" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="mobileNavOpen"
          class="fixed inset-0 z-[120] md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            class="absolute inset-0 bg-black/45"
            type="button"
            aria-label="Close navigation menu"
            @click="closeMobileNav"
          />

          <aside
            class="relative z-[121] h-full w-72 max-w-[82vw] border-r border-slate-200 bg-white"
          >
            <div class="border-b border-slate-100 p-6">
              <NuxtImg
                :src="safedLogo"
                alt="SAFED logo"
                preload
                loading="eager"
                fetch-priority="high"
                class="h-8 w-auto"
              />
            </div>

            <nav class="space-y-2 p-4">
              <NuxtLink
                v-for="item in navigationItems"
                :key="`mobile-${item.to}`"
                :to="item.to"
                class="flex items-center gap-3 rounded-lg px-4 py-2 text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900"
                active-class="bg-slate-900 text-white shadow-sm"
                @click="closeMobileNav"
              >
                <component :is="item.icon" class="h-5 w-5" />
                <span>{{ item.label }}</span>
              </NuxtLink>
            </nav>
          </aside>
        </div>
      </Transition>

      <!-- Page Content -->
      <main class="overflow-x-hidden">
        <slot />
      </main>
    </div>
  </div>
</template>
