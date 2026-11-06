<script setup lang="ts">
import { Inbox } from "@lucide/vue";

withDefaults(defineProps<{ title?: string; message?: string }>(), {
  title: "Not in this takeout",
  message: undefined,
});
</script>

<template>
  <div class="border-paper-300/80 dark:border-ink-700/60 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center">
    <Inbox class="text-ink-300 dark:text-ink-600 h-6 w-6" :stroke-width="1.5" />
    <p class="text-ink-600 dark:text-ink-300 text-sm font-medium">{{ title }}</p>
    <p v-if="message" class="text-ink-400 dark:text-ink-500 max-w-xs text-xs leading-relaxed">
      {{ message }}
    </p>
  </div>
</template>
