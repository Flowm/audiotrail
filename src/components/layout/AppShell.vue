<script setup lang="ts">
import { useRouter } from "vue-router";

import DarkToggle from "@/components/ui/DarkToggle.vue";
import ProfileSwitcher from "@/components/ui/ProfileSwitcher.vue";
import { useTakeoutStore } from "@/stores/takeout";

interface NavItem {
  label: string;
  to: string;
  icon: string;
}

const explore: NavItem[] = [
  {
    label: "Overview",
    to: "/overview",
    icon: "M3.5 3.5h7v7h-7zM13.5 3.5h7v7h-7zM3.5 13.5h7v7h-7zM13.5 13.5h7v7h-7z",
  },
  {
    label: "Listening",
    to: "/listening",
    icon: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 7v5l3.5 2",
  },
  {
    label: "Library",
    to: "/library",
    icon: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2.5H6.5A2.5 2.5 0 0 0 4 5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5",
  },
  {
    label: "People",
    to: "/people",
    icon: "M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 21v-2a4 4 0 0 0-3-3.85M15.5 3.15a4 4 0 0 1 0 7.7",
  },
  {
    label: "Money",
    to: "/money",
    icon: "M4.5 9.5h11M4.5 14.5h8M19.5 5.3a8.6 8.6 0 0 0-6.1-2.5C8.7 2.8 4.9 6.9 4.9 12s3.8 9.2 8.5 9.2c2.4 0 4.5-1 6.1-2.5",
  },
  {
    label: "Extras",
    to: "/extras",
    icon: "M12 3.5l1.8 5.4a2 2 0 0 0 1.3 1.3l5.4 1.8-5.4 1.8a2 2 0 0 0-1.3 1.3L12 20.5l-1.8-5.4a2 2 0 0 0-1.3-1.3L3.5 12l5.4-1.8a2 2 0 0 0 1.3-1.3z",
  },
];

const wrapped: NavItem = {
  label: "Wrapped",
  to: "/wrapped",
  icon: "M20 12.5V21H4v-8.5M2.5 7.5h19v5h-19zM12 21V7.5M12 7.5H7.7a2.6 2.6 0 1 1 0-5.2C11 2.3 12 7.5 12 7.5zM12 7.5h4.3a2.6 2.6 0 1 0 0-5.2C13 2.3 12 7.5 12 7.5z",
};

const about: NavItem = {
  label: "About",
  to: "/about",
  icon: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 16.5v-5M12 7.8h.01",
};

const takeout = useTakeoutStore();
const router = useRouter();

function clearData(): void {
  if (!window.confirm("Remove the loaded takeout from memory? Nothing is stored — you can re-drop the zip anytime.")) return;
  takeout.clear();
  void router.push({ name: "upload" });
}
</script>

<template>
  <div class="min-h-screen lg:flex">
    <aside class="border-paper-200 bg-paper-100/60 dark:border-ink-800 dark:bg-ink-900/30 sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r lg:flex">
      <RouterLink to="/" class="flex items-center gap-2.5 px-5 pt-6">
        <img src="/logo.svg" alt="" class="h-8 w-8" />
        <span class="flex flex-col">
          <span class="font-display text-ink-900 dark:text-paper-50 text-lg font-semibold tracking-tight"> Audiotrail </span>
          <span class="text-ink-400 dark:text-ink-500 font-mono text-[9px] tracking-[0.25em] uppercase"> local · private </span>
        </span>
      </RouterLink>

      <nav class="mt-8 flex-1 space-y-7 overflow-y-auto px-3 pb-4">
        <div v-if="takeout.hasData">
          <p class="px-3 pb-2 overline">Explore</p>
          <div class="space-y-0.5">
            <RouterLink v-for="item in explore" :key="item.to" :to="item.to" custom v-slot="{ href, navigate, isActive }">
              <a
                :href="href"
                :class="[
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                  isActive
                    ? 'bg-accent-600/10 text-accent-700 dark:bg-accent-400/10 dark:text-accent-300'
                    : 'text-ink-600 hover:bg-paper-200/60 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800/60 dark:hover:text-ink-50',
                ]"
                @click="navigate"
              >
                <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path :d="item.icon" />
                </svg>
                {{ item.label }}
              </a>
            </RouterLink>
          </div>
        </div>

        <div v-else class="px-3">
          <p class="text-ink-500 dark:text-ink-400 text-xs leading-relaxed">No takeout loaded yet.</p>
          <RouterLink to="/" class="text-accent-700 dark:text-accent-300 mt-2 inline-block text-xs font-medium underline-offset-2 hover:underline">
            Drop your Audible.zip →
          </RouterLink>
        </div>

        <div>
          <p class="px-3 pb-2 overline">Story</p>
          <div class="space-y-0.5">
            <RouterLink v-if="takeout.hasData" :to="wrapped.to" custom v-slot="{ href, navigate, isActive }">
              <a
                :href="href"
                :class="[
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                  isActive
                    ? 'bg-accent-600/10 text-accent-700 dark:bg-accent-400/10 dark:text-accent-300'
                    : 'text-ink-600 hover:bg-paper-200/60 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800/60 dark:hover:text-ink-50',
                ]"
                @click="navigate"
              >
                <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path :d="wrapped.icon" />
                </svg>
                {{ wrapped.label }}
              </a>
            </RouterLink>

            <RouterLink :to="about.to" custom v-slot="{ href, navigate, isActive }">
              <a
                :href="href"
                :class="[
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                  isActive
                    ? 'bg-accent-600/10 text-accent-700 dark:bg-accent-400/10 dark:text-accent-300'
                    : 'text-ink-600 hover:bg-paper-200/60 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800/60 dark:hover:text-ink-50',
                ]"
                @click="navigate"
              >
                <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path :d="about.icon" />
                </svg>
                {{ about.label }}
              </a>
            </RouterLink>
          </div>
        </div>
      </nav>

      <div class="border-paper-200 dark:border-ink-800 space-y-3 border-t px-5 py-4">
        <div v-if="takeout.profiles.length > 1">
          <p class="pb-1.5 overline">Profile</p>
          <ProfileSwitcher />
        </div>
        <div class="flex items-center justify-between">
          <DarkToggle />
          <button
            v-if="takeout.hasData"
            type="button"
            class="text-ink-500 hover:bg-paper-200/60 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800/60 dark:hover:text-ink-50 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors"
            @click="clearData"
          >
            Clear data
          </button>
        </div>
        <p class="text-ink-400 dark:text-ink-500 flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.18em] uppercase">
          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
            <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
          </svg>
          100% local
        </p>
      </div>
    </aside>

    <div class="min-w-0 flex-1">
      <header class="border-paper-200 bg-paper-50/90 dark:border-ink-800 dark:bg-ink-950/90 sticky top-0 z-40 border-b backdrop-blur lg:hidden">
        <div class="flex items-center justify-between px-4 py-3">
          <RouterLink to="/" class="flex items-center gap-2">
            <img src="/logo.svg" alt="" class="h-7 w-7" />
            <span class="font-display text-ink-900 dark:text-paper-50 text-base font-semibold tracking-tight"> Audiotrail </span>
          </RouterLink>
          <DarkToggle />
        </div>
        <nav v-if="takeout.hasData" class="flex [scrollbar-width:none] gap-1 overflow-x-auto px-3 pb-2 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <RouterLink v-for="item in [...explore, wrapped, about]" :key="item.to" :to="item.to" custom v-slot="{ href, navigate, isActive }">
            <a
              :href="href"
              :class="[
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-accent-600/10 text-accent-700 dark:bg-accent-400/10 dark:text-accent-300'
                  : 'text-ink-600 hover:bg-paper-200/60 dark:text-ink-300 dark:hover:bg-ink-800/60',
              ]"
              @click="navigate"
            >
              {{ item.label }}
            </a>
          </RouterLink>
        </nav>
        <div v-if="takeout.hasData && takeout.profiles.length > 1" class="px-3 pb-2">
          <ProfileSwitcher />
        </div>
      </header>

      <main>
        <div class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
