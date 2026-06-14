<script setup lang="ts">
defineProps<{ label: string; value: string; sub?: string | null }>();
</script>

<template>
  <div class="panel px-4 py-4 sm:px-5">
    <p class="overline">{{ label }}</p>
    <p class="font-display text-ink-900 dark:text-paper-50 mt-1.5 text-2xl font-semibold tracking-tight sm:text-[27px]">
      {{ value }}
    </p>
    <p v-if="sub" class="text-ink-500 dark:text-ink-400 mt-1 text-xs leading-relaxed">{{ sub }}</p>
  </div>
</template>
