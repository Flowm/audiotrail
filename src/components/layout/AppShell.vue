<script setup lang="ts">
import { Book, Clock, Euro, Gift, Info, LayoutGrid, Lock, Sparkle, Users, type LucideIcon } from "@lucide/vue";
import { useRouter } from "vue-router";

import DarkToggle from "@/components/ui/DarkToggle.vue";
import GithubLink from "@/components/ui/GithubLink.vue";
import ProfileSwitcher from "@/components/ui/ProfileSwitcher.vue";
import { useTakeoutStore } from "@/stores/takeout";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

const explore: NavItem[] = [
  {
    label: "Overview",
    to: "/overview",
    icon: LayoutGrid,
  },
  {
    label: "Listening",
    to: "/listening",
    icon: Clock,
  },
  {
    label: "Library",
    to: "/library",
    icon: Book,
  },
  {
    label: "People",
    to: "/people",
    icon: Users,
  },
  {
    label: "Money",
    to: "/money",
    icon: Euro,
  },
  {
    label: "Extras",
    to: "/extras",
    icon: Sparkle,
  },
];

const wrapped: NavItem = {
  label: "Wrapped",
  to: "/wrapped",
  icon: Gift,
};

const about: NavItem = {
  label: "About",
  to: "/about",
  icon: Info,
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
          <span class="text-ink-400 dark:text-ink-500 font-mono text-[9px] tracking-[0.25em] uppercase"> private listening report</span>
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
                <component :is="item.icon" class="h-[18px] w-[18px] shrink-0" :stroke-width="1.7" />
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
                <component :is="wrapped.icon" class="h-[18px] w-[18px] shrink-0" :stroke-width="1.7" />
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
                <component :is="about.icon" class="h-[18px] w-[18px] shrink-0" :stroke-width="1.7" />
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
          <div class="flex items-center gap-2">
            <DarkToggle />
            <GithubLink />
          </div>
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
          <Lock class="h-3 w-3" />
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
          <div class="flex items-center gap-2">
            <GithubLink />
            <DarkToggle />
          </div>
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
