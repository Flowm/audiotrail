<script setup lang="ts">
import { computed, ref } from "vue";

import BaseChart from "@/components/charts/BaseChart.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import PersonLeaderboard from "@/components/ui/PersonLeaderboard.vue";
import SectionHeader from "@/components/ui/SectionHeader.vue";
import { useChartTheme } from "@/composables/useChartTheme";
import { useDataset } from "@/composables/useDataset";
import { authorErasOption } from "@/lib/charts/people";
import { sankeyOption } from "@/lib/charts/sankey";
import { authorNarratorSankey, authorStats, monthlyAuthorHours, narratorStats, seriesStats } from "@/lib/derive/people";
import { formatDuration, formatNumber } from "@/lib/format";
import { useTakeoutStore } from "@/stores/takeout";

const takeout = useTakeoutStore();
const palette = useChartTheme();
const libraryAvailability = useDataset("library");

const books = computed(() => takeout.bookStats.books);
const authors = computed(() => authorStats(books.value));
const narrators = computed(() => narratorStats(books.value));
const series = computed(() => seriesStats(books.value));

const metric = ref<"hours" | "books">("hours");

const topNarrator = computed(() => narrators.value[0] ?? null);

const eras = computed(() => authorErasOption(monthlyAuthorHours(takeout.sessions, books.value, 5), palette.value));
const sankey = computed(() => {
  const data = authorNarratorSankey(books.value, 10);
  return data.links.length > 0 ? sankeyOption(data, palette.value, (value) => `${value} h`) : null;
});

const hasPeople = computed(() => authors.value.length > 0 || narrators.value.length > 0);
</script>

<template>
  <div class="space-y-10">
    <section>
      <p class="overline">№ 04 · Voices</p>
      <div class="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 class="font-display text-ink-900 dark:text-paper-50 text-3xl font-semibold tracking-tight">People</h1>
        <p v-if="topNarrator" class="text-ink-400 dark:text-ink-500 font-mono text-[10px] tracking-[0.16em] uppercase">
          the voice in your head: {{ formatDuration(topNarrator.totalMs) }} of
          {{ topNarrator.name }}
        </p>
      </div>
    </section>

    <template v-if="libraryAvailability.available.value && hasPeople">
      <section class="space-y-3">
        <div class="flex flex-wrap items-end justify-between gap-2">
          <SectionHeader title="Leaderboards" hint="authors & narrators" />
          <div class="flex gap-1">
            <button
              v-for="option in ['hours', 'books'] as const"
              :key="option"
              type="button"
              :class="[
                'rounded-full px-2.5 py-1 font-mono text-[11px] transition-colors',
                metric === option
                  ? 'bg-accent-600/15 text-accent-700 dark:bg-accent-400/15 dark:text-accent-300'
                  : 'text-ink-500 hover:bg-paper-200/60 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800/60 dark:hover:text-ink-100',
              ]"
              @click="metric = option"
            >
              by {{ option }}
            </button>
          </div>
        </div>
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="panel px-5 py-4">
            <p class="pb-3 overline">Authors</p>
            <PersonLeaderboard :people="authors" :metric="metric" />
          </div>
          <div class="panel px-5 py-4">
            <p class="pb-3 overline">Narrators</p>
            <PersonLeaderboard :people="narrators" :metric="metric" />
          </div>
        </div>
      </section>

      <section class="space-y-3">
        <SectionHeader title="Author eras" hint="monthly hours · top 5 authors" />
        <div class="panel p-3 sm:p-4">
          <BaseChart :option="eras" :height="300" />
        </div>
      </section>

      <section class="space-y-3">
        <SectionHeader title="Who narrates what you read" hint="hours · top 10 authors" />
        <div class="panel p-3 sm:p-4">
          <BaseChart
            :option="sankey"
            :height="420"
            empty-title="No author–narrator pairs"
            empty-message="This needs library items with both authors and narrators plus listening time."
          />
        </div>
      </section>

      <section v-if="series.length > 0" class="space-y-3">
        <SectionHeader title="Series progress" :hint="`${formatNumber(series.length)} series`" />
        <div class="panel overflow-x-auto">
          <table class="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr class="border-paper-200 dark:border-ink-800 border-b">
                <th class="px-4 py-2.5 overline">Series</th>
                <th class="px-4 py-2.5 overline">Owned</th>
                <th class="px-4 py-2.5 overline">Started</th>
                <th class="px-4 py-2.5 overline">Finished</th>
                <th class="px-4 py-2.5 overline">Hours</th>
                <th class="px-4 py-2.5 overline">Progress</th>
              </tr>
            </thead>
            <tbody class="divide-paper-200/60 dark:divide-ink-800/60 divide-y">
              <tr v-for="entry in series" :key="entry.key">
                <td class="text-ink-800 dark:text-ink-100 max-w-[280px] truncate px-4 py-2 font-medium" :title="entry.title">
                  {{ entry.title }}
                </td>
                <td class="text-ink-500 dark:text-ink-400 px-4 py-2 font-mono text-xs">
                  {{ entry.owned }}
                </td>
                <td class="text-ink-500 dark:text-ink-400 px-4 py-2 font-mono text-xs">
                  {{ entry.started }}
                </td>
                <td class="text-ink-500 dark:text-ink-400 px-4 py-2 font-mono text-xs">
                  {{ entry.finished }}
                </td>
                <td class="text-ink-700 dark:text-ink-200 px-4 py-2 font-mono text-xs">
                  {{ entry.totalMs > 0 ? formatDuration(entry.totalMs) : "—" }}
                </td>
                <td class="px-4 py-2">
                  <div class="flex items-center gap-2">
                    <span class="bg-paper-200 dark:bg-ink-800 h-1.5 w-24 overflow-hidden rounded-full">
                      <span class="bg-accent-500 block h-full rounded-full" :style="{ width: `${entry.owned > 0 ? Math.round((entry.finished / entry.owned) * 100) : 0}%` }" />
                    </span>
                    <span class="text-ink-500 dark:text-ink-400 font-mono text-[11px]"> {{ entry.finished }}/{{ entry.owned }} </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <EmptyState v-else title="No people data" message="Authors and narrators come from the library dataset, which is missing or empty in this takeout." />
  </div>
</template>
