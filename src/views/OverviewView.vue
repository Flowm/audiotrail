<script setup lang="ts">
import { computed, ref, watch } from "vue";

import BaseChart from "@/components/charts/BaseChart.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import SectionHeader from "@/components/ui/SectionHeader.vue";
import StatCard from "@/components/ui/StatCard.vue";
import { useChartTheme } from "@/composables/useChartTheme";
import { useDataset } from "@/composables/useDataset";
import { topBooksOption } from "@/lib/charts/books";
import { calendarHeatmapOption } from "@/lib/charts/calendar";
import { cumulativeHoursOption } from "@/lib/charts/trend";
import { cumulative, longestStreak, yearlyTotals } from "@/lib/derive/time";
import { formatDate, formatEur, formatHours, formatNumber } from "@/lib/format";
import { useTakeoutStore } from "@/stores/takeout";

const takeout = useTakeoutStore();
const palette = useChartTheme();
const listening = useDataset("listening");

const days = computed(() => takeout.days);
const books = computed(() => takeout.bookStats.books);

const years = computed(() => yearlyTotals(days.value).map((entry) => entry.year));
const selectedYear = ref<number | null>(null);
watch(
  years,
  (available) => {
    if (selectedYear.value === null || !available.includes(selectedYear.value)) {
      selectedYear.value = available[available.length - 1] ?? null;
    }
  },
  { immediate: true },
);

const rangeLabel = computed(() => {
  if (days.value.length === 0) return "";
  const first = days.value[0]!.date;
  const last = days.value[days.value.length - 1]!.date;
  return `${formatDate(first)} — ${formatDate(last)}`;
});

// ----- hero stats -----------------------------------------------------------

const totalMs = computed(() => days.value.reduce((sum, day) => sum + day.ms, 0));
const started = computed(() => books.value.filter((book) => book.totalMs > 0).length);
const finished = computed(() => books.value.filter((book) => book.finished).length);
const streak = computed(() => longestStreak(days.value));

const memberSince = computed(() => {
  const fromAccount = takeout.accountInfo?.creationDate ?? null;
  const firstListen = days.value.length > 0 ? Date.parse(`${days.value[0]!.date}T00:00:00Z`) : null;
  const candidates = [fromAccount, firstListen].filter((value): value is number => value !== null);
  return candidates.length > 0 ? Math.min(...candidates) : null;
});

function spendIn(yearPrefix: string | null): number {
  const billings = takeout.bundle?.billings ?? [];
  const purchases = takeout.bundle?.purchases ?? [];
  const membership = billings.filter((b) => b.type === "Charge" && (yearPrefix === null || b.billingDate.startsWith(yearPrefix))).reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);
  const cash = purchases.filter((p) => p.type === "CASH" && (yearPrefix === null || p.orderPlaceDate.startsWith(yearPrefix))).reduce((sum, p) => sum + (p.pricePaid ?? 0), 0);
  return membership + cash;
}

const hasMoneyData = computed(() => (takeout.bundle?.billings.length ?? 0) > 0 || (takeout.bundle?.purchases.length ?? 0) > 0);
const lifetimeSpend = computed(() => (hasMoneyData.value ? spendIn(null) : null));

// ----- charts ---------------------------------------------------------------

const heatmapOption = computed(() => (days.value.length > 0 && selectedYear.value !== null ? calendarHeatmapOption(days.value, selectedYear.value, palette.value) : null));

const cumulativeOption = computed(() => (days.value.length > 0 ? cumulativeHoursOption(cumulative(days.value), palette.value) : null));

const topBooksOpt = computed(() => (books.value.some((book) => book.totalMs > 0) ? topBooksOption(books.value, 5, palette.value) : null));

// ----- year over year -------------------------------------------------------

interface DeltaRow {
  label: string;
  current: string;
  delta: string | null;
  up: boolean;
  note: string;
}

const yoy = computed(() => {
  if (years.value.length < 2) return null;
  const current = years.value[years.value.length - 1]!;
  const previous = current - 1;
  const totalsByYear = new Map(yearlyTotals(days.value).map((entry) => [entry.year, entry.ms]));
  if (!totalsByYear.has(previous)) return null;

  const finishedIn = (year: number): number => books.value.filter((book) => book.finished && book.lastListen?.startsWith(`${year}-`)).length;

  const rows: DeltaRow[] = [];
  const push = (label: string, currentValue: number, previousValue: number, format: (value: number) => string): void => {
    const delta = previousValue > 0 ? Math.round(((currentValue - previousValue) / previousValue) * 100) : null;
    rows.push({
      label,
      current: format(currentValue),
      delta: delta === null ? null : `${delta >= 0 ? "+" : ""}${delta}%`,
      up: currentValue >= previousValue,
      note: `vs ${format(previousValue)} in ${previous}`,
    });
  };

  push("Listening", totalsByYear.get(current) ?? 0, totalsByYear.get(previous) ?? 0, formatHours);
  push("Books finished", finishedIn(current), finishedIn(previous), (v) => formatNumber(v));
  if (hasMoneyData.value) {
    push("Spend", spendIn(`${current}-`), spendIn(`${previous}-`), formatEur);
  }

  const partial = current === new Date().getUTCFullYear();
  return { current, previous, partial, rows };
});
</script>

<template>
  <div class="space-y-10">
    <section>
      <p class="overline">№ 01 · The big picture</p>
      <div class="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 class="font-display text-ink-900 dark:text-paper-50 text-3xl font-semibold tracking-tight">Overview</h1>
        <p class="text-ink-400 dark:text-ink-500 font-mono text-[10px] tracking-[0.16em] uppercase">
          {{ rangeLabel }}
        </p>
      </div>
    </section>

    <template v-if="listening.available.value">
      <section class="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total listening" :value="formatHours(totalMs)" :sub="`across ${formatNumber(days.length)} days with audio`" />
        <StatCard
          label="Books started"
          :value="formatNumber(started)"
          :sub="`${formatNumber(finished)} finished · ${formatNumber(takeout.bookStats.samplesBrowsed)} samples browsed`"
        />
        <StatCard label="Longest streak" :value="`${formatNumber(streak.days)} days`" :sub="streak.start ? `${formatDate(streak.start)} — ${formatDate(streak.end)}` : null" />
        <StatCard label="Member since" :value="memberSince ? formatDate(memberSince) : '—'" :sub="takeout.accountInfo?.marketplace ?? null" />
        <StatCard
          label="Lifetime spend"
          :value="lifetimeSpend !== null ? formatEur(lifetimeSpend) : '—'"
          :sub="lifetimeSpend !== null ? 'membership + shop' : 'no purchase data found'"
        />
      </section>

      <section class="space-y-3">
        <div class="flex flex-wrap items-end justify-between gap-2">
          <SectionHeader title="Listening heatmap" hint="minutes per day" />
          <div class="flex flex-wrap gap-1">
            <button
              v-for="year in years"
              :key="year"
              type="button"
              :class="[
                'rounded-full px-2.5 py-1 font-mono text-[11px] transition-colors',
                selectedYear === year
                  ? 'bg-accent-600/15 text-accent-700 dark:bg-accent-400/15 dark:text-accent-300'
                  : 'text-ink-500 hover:bg-paper-200/60 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800/60 dark:hover:text-ink-100',
              ]"
              @click="selectedYear = year"
            >
              {{ year }}
            </button>
          </div>
        </div>
        <div class="panel overflow-x-auto p-3 sm:p-4">
          <div class="min-w-[640px]">
            <BaseChart :option="heatmapOption" :height="190" />
          </div>
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-5">
        <div class="space-y-3 lg:col-span-3">
          <SectionHeader title="The long trail" hint="cumulative hours" />
          <div class="panel p-3 sm:p-4">
            <BaseChart :option="cumulativeOption" :height="280" />
          </div>
        </div>
        <div class="space-y-3 lg:col-span-2">
          <SectionHeader title="Most-heard books" hint="top 5 by hours" />
          <div class="panel p-3 sm:p-4">
            <BaseChart :option="topBooksOpt" :height="280" empty-title="No full-title listening yet" />
          </div>
        </div>
      </section>

      <section v-if="yoy" class="space-y-3">
        <SectionHeader :title="`${yoy.current} vs ${yoy.previous}`" :hint="yoy.partial ? `${yoy.current} is still in progress` : 'year over year'" />
        <div class="grid gap-3 sm:grid-cols-3">
          <div v-for="row in yoy.rows" :key="row.label" class="panel px-4 py-4 sm:px-5">
            <p class="overline">{{ row.label }}</p>
            <div class="mt-1.5 flex flex-wrap items-baseline gap-2">
              <span class="font-display text-ink-900 dark:text-paper-50 text-2xl font-semibold tracking-tight">
                {{ row.current }}
              </span>
              <span
                v-if="row.delta"
                :class="[
                  'rounded-full px-2 py-0.5 font-mono text-[10px]',
                  row.up ? 'bg-accent-600/10 text-accent-700 dark:bg-accent-400/10 dark:text-accent-300' : 'bg-paper-200/70 text-ink-500 dark:bg-ink-800/70 dark:text-ink-400',
                ]"
              >
                {{ row.delta }}
              </span>
            </div>
            <p class="text-ink-500 dark:text-ink-400 mt-1 text-xs">{{ row.note }}</p>
          </div>
        </div>
      </section>

      <p v-if="takeout.bookStats.unmatchedListened > 0" class="text-ink-400 dark:text-ink-600 font-mono text-[10px] tracking-[0.16em] uppercase">
        {{ takeout.bookStats.unmatchedListened }} listened titles had no library match — they're counted by product name
      </p>
    </template>

    <EmptyState v-else title="No listening history in this takeout" message="The Audible.Listening folder seems to be missing or empty, so the overview has nothing to chart." />
  </div>
</template>
