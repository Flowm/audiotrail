<script setup lang="ts">
defineProps<{ title: string; hint?: string }>();
</script>

<template>
  <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
    <h2 class="font-display text-ink-900 dark:text-paper-50 text-lg font-semibold tracking-tight">
      {{ title }}
    </h2>
    <p v-if="hint" class="text-ink-400 dark:text-ink-500 font-mono text-[10px] tracking-[0.16em] uppercase">
      {{ hint }}
    </p>
  </div>
</template>
