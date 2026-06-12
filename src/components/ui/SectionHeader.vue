<script setup lang="ts">
defineProps<{ title: string; hint?: string }>()
</script>

<template>
  <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
    <h2 class="font-display text-lg font-semibold tracking-tight text-ink-900 dark:text-paper-50">
      {{ title }}
    </h2>
    <p v-if="hint" class="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400 dark:text-ink-500">
      {{ hint }}
    </p>
  </div>
</template>
