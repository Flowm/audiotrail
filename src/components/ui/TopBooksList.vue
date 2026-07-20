<script setup lang="ts">
import { computed } from "vue";

import BookCover from "@/components/ui/BookCover.vue";
import type { BookStats } from "@/lib/derive/books";
import { formatDuration, formatPercent } from "@/lib/format";

const props = withDefaults(defineProps<{ books: BookStats[]; limit?: number }>(), { limit: 5 });

const rows = computed(() => {
  const top = props.books.filter((book) => book.totalMs > 0).slice(0, props.limit);
  const max = Math.max(1, ...top.map((book) => book.totalMs));
  return top.map((book) => ({ ...book, share: book.totalMs / max }));
});
</script>

<template>
  <ol class="space-y-3.5">
    <li v-for="(book, index) in rows" :key="book.key" class="flex items-center gap-3">
      <span class="text-ink-400 dark:text-ink-500 w-6 shrink-0 font-mono text-[11px]">
        {{ String(index + 1).padStart(2, "0") }}
      </span>
      <BookCover :asin="book.asin" :title="book.title" class="w-10 text-[11px]" />
      <div class="min-w-0 flex-1">
        <div class="flex items-baseline justify-between gap-3">
          <span class="text-ink-800 dark:text-ink-100 truncate text-sm font-medium" :title="book.title">
            {{ book.title }}
          </span>
          <span class="text-ink-500 dark:text-ink-400 shrink-0 font-mono text-[11px]">
            {{ formatDuration(book.totalMs) }}<template v-if="book.completion !== null"> · {{ formatPercent(book.completion) }}</template>
          </span>
        </div>
        <p v-if="book.library?.authors.length" class="text-ink-400 dark:text-ink-500 truncate text-xs">
          {{ book.library.authors.join(", ") }}
        </p>
        <div class="bg-paper-200/80 dark:bg-ink-800/80 mt-1.5 h-1 overflow-hidden rounded-full">
          <div class="bg-accent-500/80 h-full rounded-full" :style="{ width: `${Math.max(2, Math.round(book.share * 100))}%` }" />
        </div>
      </div>
    </li>
  </ol>
</template>
