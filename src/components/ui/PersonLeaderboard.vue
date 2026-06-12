<script setup lang="ts">
import { computed } from 'vue'

import type { PersonStats } from '@/lib/derive/people'
import { formatDuration, formatNumber } from '@/lib/format'

const props = withDefaults(
  defineProps<{ people: PersonStats[]; metric: 'hours' | 'books'; limit?: number }>(),
  { limit: 10 },
)

const rows = computed(() => {
  const sorted = [...props.people].sort((a, b) =>
    props.metric === 'hours' ? b.totalMs - a.totalMs : b.bookCount - a.bookCount,
  )
  const top = sorted.slice(0, props.limit)
  const max =
    props.metric === 'hours'
      ? Math.max(1, ...top.map((person) => person.totalMs))
      : Math.max(1, ...top.map((person) => person.bookCount))
  return top.map((person) => ({
    ...person,
    share: (props.metric === 'hours' ? person.totalMs : person.bookCount) / max,
  }))
})
</script>

<template>
  <ol class="space-y-2.5">
    <li v-for="(person, index) in rows" :key="person.name" class="flex items-center gap-3">
      <span class="w-6 shrink-0 font-mono text-[11px] text-ink-400 dark:text-ink-500">
        {{ String(index + 1).padStart(2, '0') }}
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex items-baseline justify-between gap-3">
          <span class="truncate text-sm font-medium text-ink-800 dark:text-ink-100">
            {{ person.name }}
          </span>
          <span class="shrink-0 font-mono text-[11px] text-ink-500 dark:text-ink-400">
            <template v-if="metric === 'hours'">{{ formatDuration(person.totalMs) }}</template>
            <template v-else>{{ formatNumber(person.bookCount) }} books</template>
          </span>
        </div>
        <div class="mt-1 h-1 overflow-hidden rounded-full bg-paper-200/80 dark:bg-ink-800/80">
          <div
            class="h-full rounded-full bg-accent-500/80"
            :style="{ width: `${Math.max(2, Math.round(person.share * 100))}%` }"
          />
        </div>
      </div>
    </li>
  </ol>
</template>
