<script setup lang="ts">
import { formatNumber } from '@/lib/format'
import type { LoadReport } from '@/types/takeout'

defineProps<{ report: LoadReport }>()
</script>

<template>
  <div class="panel px-5 py-5 text-left sm:px-6">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="font-display text-lg font-semibold tracking-tight text-ink-900 dark:text-paper-50">
        What we found
      </h2>
      <p class="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400 dark:text-ink-500">
        {{ report.entryCount }} files · {{ report.recognizedFileCount }} recognized ·
        {{ report.durationMs }} ms
      </p>
    </div>

    <ul class="mt-4 divide-y divide-paper-200/70 dark:divide-ink-800/70">
      <li
        v-for="dataset in report.datasets"
        :key="dataset.key"
        class="flex items-start gap-3 py-2.5"
      >
        <span
          :class="[
            'mt-1 h-2 w-2 shrink-0 rounded-full',
            dataset.status === 'loaded'
              ? 'bg-accent-500'
              : dataset.status === 'missing'
                ? 'bg-ink-300 dark:bg-ink-700'
                : 'bg-rose-500',
          ]"
          :title="dataset.status"
        />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-baseline justify-between gap-x-3">
            <span
              :class="[
                'text-sm font-medium',
                dataset.status === 'missing'
                  ? 'text-ink-400 dark:text-ink-500'
                  : 'text-ink-800 dark:text-ink-100',
              ]"
            >
              {{ dataset.label }}
            </span>
            <span class="font-mono text-[11px] text-ink-500 dark:text-ink-400">
              <template v-if="dataset.status === 'loaded'">
                {{ formatNumber(dataset.rows) }} rows
              </template>
              <template v-else-if="dataset.status === 'missing'">not in this takeout</template>
              <template v-else>failed</template>
            </span>
          </div>
          <p v-if="dataset.detail" class="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
            {{ dataset.detail }}
          </p>
          <p v-if="dataset.error" class="mt-0.5 text-xs text-rose-600 dark:text-rose-400">
            {{ dataset.error }}
          </p>
          <details v-if="dataset.warnings.length > 0" class="mt-1">
            <summary
              class="cursor-pointer text-xs text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
            >
              {{ dataset.warnings.length }} warning{{ dataset.warnings.length === 1 ? '' : 's' }}
            </summary>
            <ul class="mt-1 space-y-0.5 font-mono text-[11px] text-ink-500 dark:text-ink-400">
              <li v-for="(warning, index) in dataset.warnings" :key="index">{{ warning }}</li>
            </ul>
          </details>
        </div>
      </li>
    </ul>

    <details v-if="report.ignoredPaths.length > 0" class="mt-3">
      <summary
        class="cursor-pointer text-xs text-ink-400 underline-offset-2 hover:underline dark:text-ink-500"
      >
        {{ report.ignoredPaths.length }} file{{ report.ignoredPaths.length === 1 ? '' : 's' }}
        ignored (no parser yet)
      </summary>
      <ul class="mt-1 space-y-0.5 font-mono text-[11px] text-ink-400 dark:text-ink-500">
        <li v-for="path in report.ignoredPaths" :key="path" class="truncate">{{ path }}</li>
      </ul>
    </details>
  </div>
</template>
