<script setup lang="ts">
withDefaults(defineProps<{ title?: string; message?: string }>(), {
  title: "Not in this takeout",
  message: undefined,
});
</script>

<template>
  <div class="border-paper-300/80 dark:border-ink-700/60 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center">
    <svg class="text-ink-300 dark:text-ink-600 h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 10a9 9 0 0 1 18 0v8H3zM3 14h18" />
    </svg>
    <p class="text-ink-600 dark:text-ink-300 text-sm font-medium">{{ title }}</p>
    <p v-if="message" class="text-ink-400 dark:text-ink-500 max-w-xs text-xs leading-relaxed">
      {{ message }}
    </p>
  </div>
</template>
