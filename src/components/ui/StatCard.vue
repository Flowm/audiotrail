<script setup lang="ts">
defineProps<{ label: string; value: string; sub?: string | null }>()
</script>

<template>
  <div class="panel px-4 py-4 sm:px-5">
    <p class="overline">{{ label }}</p>
    <p
      class="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink-900 sm:text-[27px] dark:text-paper-50"
    >
      {{ value }}
    </p>
    <p v-if="sub" class="mt-1 text-xs leading-relaxed text-ink-500 dark:text-ink-400">{{ sub }}</p>
  </div>
</template>
