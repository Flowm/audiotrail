<script setup lang="ts">
import { computed, ref } from "vue";

import BaseChart from "@/components/charts/BaseChart.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import SectionHeader from "@/components/ui/SectionHeader.vue";
import StatCard from "@/components/ui/StatCard.vue";
import { useChartTheme } from "@/composables/useChartTheme";
import { useDataset } from "@/composables/useDataset";
import { donutOption, type DonutSlice } from "@/lib/charts/donut";
import { erasOption, rhythmOption, sessionHistogramOption, weekdayOption, type RhythmGranularity } from "@/lib/charts/listening";
import { monthlySeriesHours } from "@/lib/derive/people";
import { biggestDays, sessionLengthHistogram, weekdayAverages } from "@/lib/derive/time";
import { formatDate, formatDuration, formatNumber } from "@/lib/format";
import { useTakeoutStore } from "@/stores/takeout";

const takeout = useTakeoutStore();
const palette = useChartTheme();
const listening = useDataset("listening");

const sessions = computed(() => takeout.sessions);
const days = computed(() => takeout.days);
const books = computed(() => takeout.bookStats.books);

const granularity = ref<RhythmGranularity>("day");
const granularities: { key: RhythmGranularity; label: string }[] = [
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
];

const rhythm = computed(() => (days.value.length > 0 ? rhythmOption(granularity.value, days.value, palette.value) : null));
const eras = computed(() => erasOption(monthlySeriesHours(sessions.value, books.value), palette.value));
const weekday = computed(() => (days.value.length > 0 ? weekdayOption(weekdayAverages(days.value), palette.value) : null));
const histogram = computed(() => (sessions.value.length > 0 ? sessionHistogramOption(sessionLengthHistogram(sessions.value), palette.value) : null));
const topDays = computed(() => biggestDays(sessions.value, 10));

// ----- habit aggregations ----------------------------------------------------

function shareByMs(pick: (session: (typeof sessions.value)[number]) => string | null, rename?: (key: string) => string): DonutSlice[] {
  const byKey = new Map<string, number>();
  for (const session of sessions.value) {
    const key = pick(session);
    if (key === null) continue;
    byKey.set(key, (byKey.get(key) ?? 0) + session.durationMs);
  }
  return [...byKey.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name: rename ? rename(name) : name, value }));
}

const deliveryShare = computed(() => shareByMs((s) => s.deliveryType));
const modeShare = computed(() => shareByMs((s) => s.listeningMode));
const speedShare = computed(() =>
  shareByMs(
    (s) => (s.narrationSpeed !== null ? s.narrationSpeed.toFixed(2) : null),
    (key) => `${Number(key)}×`,
  ),
);

const hoursFmt = (value: number): string => formatDuration(value);

interface AppVersionRow {
  version: string;
  sessions: number;
  first: string;
  last: string;
}

const appVersions = computed<AppVersionRow[]>(() => {
  const byVersion = new Map<string, { sessions: number; first: string; last: string }>();
  for (const session of sessions.value) {
    if (session.appVersion === null) continue;
    const entry = byVersion.get(session.appVersion);
    if (!entry) {
      byVersion.set(session.appVersion, {
        sessions: 1,
        first: session.startDate,
        last: session.startDate,
      });
    } else {
      entry.sessions += 1;
      if (session.startDate < entry.first) entry.first = session.startDate;
      if (session.startDate > entry.last) entry.last = session.startDate;
    }
  }
  return [...byVersion.entries()]
    .map(([version, entry]) => ({ version, ...entry }))
    .sort((a, b) => (a.first < b.first ? 1 : -1))
    .slice(0, 10);
});

const avgPerActiveDay = computed(() => (days.value.length > 0 ? days.value.reduce((sum, day) => sum + day.ms, 0) / days.value.length : 0));
</script>

<template>
  <div class="space-y-10">
    <section>
      <p class="overline">№ 02 · Time</p>
      <h1 class="font-display text-ink-900 dark:text-paper-50 mt-2 text-3xl font-semibold tracking-tight">Listening</h1>
    </section>

    <template v-if="listening.available.value && sessions.length > 0">
      <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Sessions" :value="formatNumber(sessions.length)" />
        <StatCard label="Active days" :value="formatNumber(days.length)" />
        <StatCard label="Avg per active day" :value="formatDuration(avgPerActiveDay)" />
        <StatCard label="Biggest day" :value="topDays[0] ? formatDuration(topDays[0].ms) : '—'" :sub="topDays[0] ? formatDate(topDays[0].date) : null" />
      </section>

      <section class="space-y-3">
        <div class="flex flex-wrap items-end justify-between gap-2">
          <SectionHeader title="Rhythm" hint="drag the brush to zoom" />
          <div class="flex gap-1">
            <button
              v-for="option in granularities"
              :key="option.key"
              type="button"
              :class="[
                'rounded-full px-2.5 py-1 font-mono text-[11px] transition-colors',
                granularity === option.key
                  ? 'bg-accent-600/15 text-accent-700 dark:bg-accent-400/15 dark:text-accent-300'
                  : 'text-ink-500 hover:bg-paper-200/60 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800/60 dark:hover:text-ink-100',
              ]"
              @click="granularity = option.key"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <div class="panel p-3 sm:p-4">
          <BaseChart :option="rhythm" :height="320" />
        </div>
      </section>

      <section class="space-y-3">
        <SectionHeader title="Eras" hint="monthly hours by series" />
        <div class="panel p-3 sm:p-4">
          <BaseChart :option="eras" :height="340" />
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-2">
        <div class="space-y-3">
          <SectionHeader title="Weekday rhythm" hint="avg minutes per calendar weekday" />
          <div class="panel p-3 sm:p-4">
            <BaseChart :option="weekday" :height="240" />
          </div>
        </div>
        <div class="space-y-3">
          <SectionHeader title="Session shapes" hint="how long you press play" />
          <div class="panel p-3 sm:p-4">
            <BaseChart :option="histogram" :height="240" />
          </div>
        </div>
      </section>

      <section class="space-y-3">
        <SectionHeader title="Biggest days" hint="top 10" />
        <div class="panel divide-paper-200/70 dark:divide-ink-800/70 divide-y px-5">
          <div v-for="(day, index) in topDays" :key="day.date" class="flex items-baseline gap-4 py-2.5">
            <span class="text-ink-400 dark:text-ink-500 w-6 shrink-0 font-mono text-[11px]">
              {{ String(index + 1).padStart(2, "0") }}
            </span>
            <span class="text-ink-800 dark:text-ink-100 w-28 shrink-0 text-sm font-medium">
              {{ formatDate(day.date) }}
            </span>
            <span class="text-accent-700 dark:text-accent-300 w-20 shrink-0 font-mono text-xs">
              {{ formatDuration(day.ms) }}
            </span>
            <span class="text-ink-500 dark:text-ink-400 min-w-0 flex-1 truncate text-xs">
              {{ day.topProducts.join(" · ") }}
            </span>
          </div>
        </div>
      </section>

      <section class="space-y-3">
        <SectionHeader title="Habits" hint="share of listening time" />
        <div class="grid gap-3 sm:grid-cols-3">
          <div class="panel p-3">
            <p class="px-2 pt-1 overline">Delivery</p>
            <BaseChart :option="deliveryShare.length ? donutOption(deliveryShare, palette, hoursFmt) : null" :height="210" />
          </div>
          <div class="panel p-3">
            <p class="px-2 pt-1 overline">Connection</p>
            <BaseChart :option="modeShare.length ? donutOption(modeShare, palette, hoursFmt) : null" :height="210" />
          </div>
          <div class="panel p-3">
            <p class="px-2 pt-1 overline">Narration speed</p>
            <BaseChart :option="speedShare.length ? donutOption(speedShare, palette, hoursFmt) : null" :height="210" />
          </div>
        </div>
        <div class="panel px-5 py-4">
          <p class="overline">App versions</p>
          <div class="mt-3 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
            <div v-for="row in appVersions" :key="row.version" class="flex items-baseline justify-between gap-3 text-xs">
              <span class="text-ink-700 dark:text-ink-200 font-mono">v{{ row.version }}</span>
              <span class="text-ink-400 dark:text-ink-500"> {{ formatDate(row.first) }} — {{ formatDate(row.last) }} · {{ formatNumber(row.sessions) }} sessions </span>
            </div>
          </div>
        </div>
      </section>
    </template>

    <EmptyState v-else title="No listening history in this takeout" message="Without Audible.Listening there is no time data to explore." />
  </div>
</template>
