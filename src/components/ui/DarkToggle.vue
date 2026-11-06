<script setup lang="ts">
import { Moon, Sun } from "@lucide/vue";

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
    <Sun v-if="settings.darkMode" class="h-4 w-4" :stroke-width="1.7" />
    <Moon v-else class="h-4 w-4" :stroke-width="1.7" />
  </button>
</template>
