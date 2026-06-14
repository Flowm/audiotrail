<script setup lang="ts">
import { useSettingsStore } from "@/stores/settings";

const settings = useSettingsStore();
</script>

<template>
  <button
    type="button"
    class="border-paper-200 text-ink-500 hover:text-ink-900 dark:border-ink-800 dark:bg-ink-900/60 dark:text-ink-400 dark:hover:text-ink-50 rounded-lg border bg-white/60 p-2 transition-colors"
    :aria-label="settings.darkMode ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="settings.toggleDark()"
  >
    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <path
        v-if="settings.darkMode"
        d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 2.5v2M12 19.5v2M4.4 4.4l1.4 1.4M18.2 18.2l1.4 1.4M2.5 12h2M19.5 12h2M4.4 19.6l1.4-1.4M18.2 5.8l1.4-1.4"
      />
      <path v-else d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
    </svg>
  </button>
</template>
