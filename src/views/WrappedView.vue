<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import BookCover from "@/components/ui/BookCover.vue";
import { yearlyTotals } from "@/lib/derive/time";
import { wrappedStats } from "@/lib/derive/wrapped";
import { formatDate, formatDuration, formatEur, formatHours, formatMonth, formatNumber, formatPercent } from "@/lib/format";
import { useTakeoutStore } from "@/stores/takeout";

const takeout = useTakeoutStore();
const route = useRoute();
const router = useRouter();

const years = computed(() => yearlyTotals(takeout.days).map((entry) => entry.year));

const year = computed(() => {
  const requested = Number(route.params.year);
  if (years.value.includes(requested)) return requested;
  return years.value[years.value.length - 1] ?? new Date().getUTCFullYear();
});

const stats = computed(() => wrappedStats(year.value, takeout.sessions, takeout.bookStats.books, takeout.bundle?.billings ?? [], takeout.bundle?.purchases ?? []));

const straightDays = computed(() => (stats.value.totalMs / 86_400_000).toFixed(1));

function pickYear(value: number): void {
  void router.replace({ name: "wrapped", params: { year: String(value) } });
}

function close(): void {
  void router.push({ name: "overview" });
}
</script>

<template>
  <div class="relative h-screen snap-y snap-mandatory overflow-y-auto">
    <!-- floating chrome -->
    <div class="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4 sm:px-8">
      <button
        type="button"
        class="border-paper-200 bg-paper-50/80 text-ink-600 hover:text-ink-900 dark:border-ink-800 dark:bg-ink-950/80 dark:text-ink-300 dark:hover:text-ink-50 pointer-events-auto rounded-full border px-3.5 py-1.5 text-sm font-medium backdrop-blur transition-colors"
        @click="close"
      >
        ← Dashboard
      </button>
      <p class="pointer-events-auto overline">Wrapped · {{ year }}</p>
    </div>

    <!-- 1 · intro -->
    <section class="relative flex min-h-screen snap-start flex-col items-center justify-center px-6 text-center">
      <div
        class="pointer-events-none absolute inset-0"
        style="background: radial-gradient(60% 45% at 50% 38%, color-mix(in oklab, var(--color-accent-500) 14%, transparent), transparent 70%)"
      />
      <p class="overline">Audiotrail Wrapped</p>
      <p class="font-display text-accent-600 dark:text-accent-400 mt-4 text-7xl font-semibold tracking-tight sm:text-8xl">
        {{ year }}
      </p>
      <p class="text-ink-500 dark:text-ink-400 mt-4 max-w-sm text-base">Your year in listening, retold from your own takeout.</p>
      <div v-if="years.length > 1" class="mt-8 flex flex-wrap items-center justify-center gap-1.5">
        <button
          v-for="candidate in years"
          :key="candidate"
          type="button"
          :class="[
            'rounded-full px-3 py-1.5 font-mono text-xs transition-colors',
            candidate === year ? 'bg-accent-600 dark:bg-accent-500 dark:text-ink-950 text-white' : 'text-ink-500 hover:bg-paper-200/70 dark:text-ink-400 dark:hover:bg-ink-800/70',
          ]"
          @click="pickYear(candidate)"
        >
          {{ candidate }}
        </button>
      </div>
      <svg
        class="text-ink-400 dark:text-ink-500 absolute bottom-8 h-5 w-5 animate-bounce"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </section>

    <template v-if="stats.totalMs > 0">
      <!-- 2 · total time -->
      <section class="flex min-h-screen snap-start flex-col items-center justify-center px-6 text-center">
        <p class="overline">You listened for</p>
        <p class="font-display text-ink-900 dark:text-paper-50 mt-4 text-7xl font-semibold tracking-tight sm:text-8xl">
          {{ formatHours(stats.totalMs) }}
        </p>
        <p class="text-ink-500 dark:text-ink-400 mt-6 max-w-md text-sm leading-relaxed">
          That's {{ straightDays }} days straight — spread over {{ formatNumber(stats.daysActive) }} listening days and {{ formatNumber(stats.sessions) }} sessions.
          {{ formatPercent(Math.min(1, stats.activeDayShare)) }} of {{ year }} had audio in it.
        </p>
      </section>

      <!-- 3 · top book -->
      <section v-if="stats.topBook" class="relative flex min-h-screen snap-start flex-col items-center justify-center px-6 text-center">
        <div
          class="pointer-events-none absolute inset-0"
          style="background: radial-gradient(55% 40% at 50% 45%, color-mix(in oklab, var(--color-accent-500) 10%, transparent), transparent 70%)"
        />
        <p class="overline">The book of your year</p>
        <BookCover :asin="stats.topBook.asin" :title="stats.topBook.name" class="mt-8 w-36 text-3xl sm:w-44" />
        <p class="font-display text-ink-900 dark:text-paper-50 mt-8 max-w-lg text-2xl font-semibold tracking-tight sm:text-3xl">
          {{ stats.topBook.name }}
        </p>
        <p class="text-accent-700 dark:text-accent-300 mt-3 font-mono text-xs tracking-[0.18em] uppercase">{{ formatDuration(stats.topBook.ms) }} together</p>
      </section>

      <!-- 4 · people -->
      <section v-if="stats.topAuthor || stats.topNarrator" class="flex min-h-screen snap-start flex-col items-center justify-center gap-14 px-6 text-center">
        <div v-if="stats.topAuthor">
          <p class="overline">Most-read author</p>
          <p class="font-display text-ink-900 dark:text-paper-50 mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            {{ stats.topAuthor.name }}
          </p>
          <p class="text-ink-500 dark:text-ink-400 mt-2 font-mono text-xs">
            {{ formatDuration(stats.topAuthor.ms) }}
          </p>
        </div>
        <div v-if="stats.topNarrator">
          <p class="overline">The voice in your head</p>
          <p class="font-display text-ink-900 dark:text-paper-50 mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            {{ stats.topNarrator.name }}
          </p>
          <p class="text-ink-500 dark:text-ink-400 mt-2 font-mono text-xs">{{ formatDuration(stats.topNarrator.ms) }} of narration</p>
        </div>
      </section>

      <!-- 5 · big day & streak -->
      <section class="flex min-h-screen snap-start flex-col items-center justify-center gap-14 px-6 text-center">
        <div v-if="stats.biggestDay">
          <p class="overline">Your biggest day</p>
          <p class="font-display text-ink-900 dark:text-paper-50 mt-3 text-5xl font-semibold tracking-tight sm:text-6xl">
            {{ formatDuration(stats.biggestDay.ms) }}
          </p>
          <p class="text-ink-500 dark:text-ink-400 mt-3 text-sm">
            on {{ formatDate(stats.biggestDay.date) }} —
            {{ stats.biggestDay.topProducts[0] }}
          </p>
        </div>
        <div v-if="stats.longestStreak.days > 1">
          <p class="overline">Longest streak</p>
          <p class="font-display text-accent-600 dark:text-accent-400 mt-3 text-5xl font-semibold tracking-tight sm:text-6xl">{{ formatNumber(stats.longestStreak.days) }} days</p>
          <p class="text-ink-500 dark:text-ink-400 mt-3 font-mono text-xs">{{ formatDate(stats.longestStreak.start) }} → {{ formatDate(stats.longestStreak.end) }}</p>
        </div>
      </section>

      <!-- 6 · busiest month -->
      <section v-if="stats.busiestMonth" class="flex min-h-screen snap-start flex-col items-center justify-center px-6 text-center">
        <p class="overline">Nothing could stop</p>
        <p class="font-display text-ink-900 dark:text-paper-50 mt-4 text-6xl font-semibold tracking-tight sm:text-7xl">
          {{ formatMonth(stats.busiestMonth.month) }}
        </p>
        <p class="text-ink-500 dark:text-ink-400 mt-5 text-sm">
          {{ formatHours(stats.busiestMonth.ms) }} in a single month · {{ formatNumber(stats.booksFinished) }} books finished across the year
        </p>
      </section>

      <!-- 7 · money -->
      <section v-if="stats.spend !== null && stats.spend > 0" class="flex min-h-screen snap-start flex-col items-center justify-center px-6 text-center">
        <p class="overline">The damage</p>
        <p class="font-display text-ink-900 dark:text-paper-50 mt-4 text-6xl font-semibold tracking-tight sm:text-7xl">
          {{ formatEur(stats.spend) }}
        </p>
        <p v-if="stats.costPerHour !== null" class="text-ink-500 dark:text-ink-400 mt-5 text-sm">which works out to {{ formatEur(stats.costPerHour) }} per listening hour</p>
      </section>

      <!-- 8 · almost finished -->
      <section v-if="stats.almostFinished.length > 0" class="flex min-h-screen snap-start flex-col items-center justify-center px-6 text-center">
        <p class="overline">Abandoned at the finish line</p>
        <div class="mt-8 space-y-5">
          <div v-for="entry in stats.almostFinished" :key="entry.title">
            <p class="font-display text-ink-900 dark:text-paper-50 max-w-md text-xl font-semibold tracking-tight">
              {{ entry.title }}
            </p>
            <p class="mt-1 font-mono text-xs text-rose-600 dark:text-rose-400">stopped at {{ formatPercent(entry.completion) }}</p>
          </div>
        </div>
        <p class="text-ink-500 dark:text-ink-400 mt-8 text-sm">So close. The ending isn't going anywhere.</p>
      </section>

      <!-- 9 · outro -->
      <section class="relative flex min-h-screen snap-start flex-col items-center justify-center px-6 text-center">
        <div
          class="pointer-events-none absolute inset-0"
          style="background: radial-gradient(60% 45% at 50% 60%, color-mix(in oklab, var(--color-accent-500) 12%, transparent), transparent 72%)"
        />
        <p class="overline">{{ year }}, in one line</p>
        <p class="font-display text-ink-900 dark:text-paper-50 mt-5 max-w-xl text-2xl leading-snug font-semibold tracking-tight sm:text-3xl">
          {{ formatHours(stats.totalMs) }} of listening, {{ formatNumber(stats.booksStarted) }} books started, {{ formatNumber(stats.booksFinished) }} finished<template
            v-if="stats.longestStreak.days > 1"
            >, one {{ formatNumber(stats.longestStreak.days) }}-day streak</template
          >.
        </p>
        <p class="text-ink-400 dark:text-ink-500 mt-6 font-mono text-[10px] tracking-[0.2em] uppercase">made locally · your data never left this tab</p>
        <button
          type="button"
          class="bg-accent-600 hover:bg-accent-700 dark:bg-accent-500 dark:text-ink-950 dark:hover:bg-accent-400 mt-10 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-colors"
          @click="close"
        >
          Back to the dashboard
        </button>
      </section>
    </template>

    <!-- quiet year fallback -->
    <section v-else class="flex min-h-screen snap-start flex-col items-center justify-center px-6 text-center">
      <p class="overline">A quiet year</p>
      <p class="text-ink-500 dark:text-ink-400 mt-4 max-w-sm text-sm">No listening recorded in {{ year }}. Pick another year above.</p>
    </section>
  </div>
</template>
