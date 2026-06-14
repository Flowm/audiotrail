<script setup lang="ts">
import { usePWAUpdate } from "@/composables/usePWAUpdate";

const { needRefresh, updateApp } = usePWAUpdate();

const dismiss = () => {
  needRefresh.value = false;
};
</script>

<template>
  <Transition name="pwa-bar">
    <div v-if="needRefresh" class="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3">
      <div
        class="border-paper-300/80 dark:border-ink-700/60 dark:bg-ink-900/90 flex items-center gap-4 rounded-xl border bg-white/90 px-4 py-3 shadow-lg backdrop-blur"
        role="status"
      >
        <span class="bg-accent-500 h-2 w-2 shrink-0 animate-pulse rounded-full" aria-hidden="true" />
        <div class="min-w-0">
          <p class="text-ink-800 dark:text-ink-100 text-sm font-medium">New version available</p>
          <p class="text-ink-400 dark:text-ink-500 text-xs">Reload to get the latest Audiotrail.</p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <button
            type="button"
            class="text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
            @click="dismiss"
          >
            Later
          </button>
          <button
            type="button"
            class="bg-accent-600 hover:bg-accent-700 dark:bg-accent-500 dark:hover:bg-accent-400 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors"
            @click="updateApp()"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.pwa-bar-enter-active,
.pwa-bar-leave-active {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}
.pwa-bar-enter-from,
.pwa-bar-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
