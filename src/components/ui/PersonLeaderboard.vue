<script setup lang="ts">
import { computed } from "vue";

import type { PersonStats } from "@/lib/derive/people";
import { formatDuration, formatNumber } from "@/lib/format";

const props = withDefaults(defineProps<{ people: PersonStats[]; metric: "hours" | "books"; limit?: number }>(), { limit: 10 });

const rows = computed(() => {
  const sorted = [...props.people].sort((a, b) => (props.metric === "hours" ? b.totalMs - a.totalMs : b.bookCount - a.bookCount));
  const top = sorted.slice(0, props.limit);
  const max = props.metric === "hours" ? Math.max(1, ...top.map((person) => person.totalMs)) : Math.max(1, ...top.map((person) => person.bookCount));
  return top.map((person) => ({
    ...person,
    share: (props.metric === "hours" ? person.totalMs : person.bookCount) / max,
  }));
});
</script>

<template>
  <ol class="space-y-2.5">
    <li v-for="(person, index) in rows" :key="person.name" class="flex items-center gap-3">
      <span class="text-ink-400 dark:text-ink-500 w-6 shrink-0 font-mono text-[11px]">
        {{ String(index + 1).padStart(2, "0") }}
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex items-baseline justify-between gap-3">
          <span class="text-ink-800 dark:text-ink-100 truncate text-sm font-medium">
            {{ person.name }}
          </span>
          <span class="text-ink-500 dark:text-ink-400 shrink-0 font-mono text-[11px]">
            <template v-if="metric === 'hours'">{{ formatDuration(person.totalMs) }}</template>
            <template v-else>{{ formatNumber(person.bookCount) }} books</template>
          </span>
        </div>
        <div class="bg-paper-200/80 dark:bg-ink-800/80 mt-1 h-1 overflow-hidden rounded-full">
          <div class="bg-accent-500/80 h-full rounded-full" :style="{ width: `${Math.max(2, Math.round(person.share * 100))}%` }" />
        </div>
      </div>
    </li>
  </ol>
</template>
