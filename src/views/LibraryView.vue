<script setup lang="ts">
import { computed, ref } from 'vue'

import BaseChart from '@/components/charts/BaseChart.vue'
import BookCover from '@/components/ui/BookCover.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import StatCard from '@/components/ui/StatCard.vue'
import { useChartTheme } from '@/composables/useChartTheme'
import { useDataset } from '@/composables/useDataset'
import { donutOption, type DonutSlice } from '@/lib/charts/donut'
import {
  acquisitionsOption,
  completionScatterOption,
  lagHistogramOption,
} from '@/lib/charts/library'
import type { BookStats } from '@/lib/derive/books'
import { acquisitionsByMonth, backlogStats } from '@/lib/derive/library'
import { formatDate, formatDuration, formatHours, formatNumber, formatPercent } from '@/lib/format'
import { useSettingsStore } from '@/stores/settings'
import { useTakeoutStore } from '@/stores/takeout'

const takeout = useTakeoutStore()
const settings = useSettingsStore()
const palette = useChartTheme()
const libraryAvailability = useDataset('library')
const purchasesAvailability = useDataset('purchases')

const books = computed(() => takeout.bookStats.books)
const withLibrary = computed(() => books.value.filter((book) => book.library !== null))

// ----- table state -----------------------------------------------------------

type SortKey = 'title' | 'length' | 'purchased' | 'listened' | 'completion'
const sortKey = ref<SortKey>('listened')
const sortDesc = ref(true)
const query = ref('')
const showAll = ref(false)
const PAGE = 30

function setSort(key: SortKey): void {
  if (sortKey.value === key) {
    sortDesc.value = !sortDesc.value
  } else {
    sortKey.value = key
    sortDesc.value = key !== 'title'
  }
}

const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase()
  let rows = books.value
  if (needle.length > 0) {
    rows = rows.filter((book) => {
      const haystack = [
        book.title,
        ...(book.library?.authors ?? []),
        ...(book.library?.narrators ?? []),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }
  const direction = sortDesc.value ? -1 : 1
  const value = (book: BookStats): number | string => {
    switch (sortKey.value) {
      case 'title':
        return book.title.toLowerCase()
      case 'length':
        return book.bookLengthMs ?? -1
      case 'purchased':
        return book.library?.purchaseDate ?? -1
      case 'listened':
        return book.totalMs
      case 'completion':
        return book.completion ?? -1
    }
  }
  return [...rows].sort((a, b) => {
    const av = value(a)
    const bv = value(b)
    return (av < bv ? -1 : av > bv ? 1 : 0) * direction
  })
})

const visible = computed(() =>
  showAll.value ? filtered.value : filtered.value.slice(0, PAGE),
)

// ----- charts ----------------------------------------------------------------

const acquisitions = computed(() =>
  acquisitionsOption(
    acquisitionsByMonth(takeout.bundle?.library ?? [], takeout.bundle?.purchases ?? []),
    palette.value,
  ),
)
const scatter = computed(() => completionScatterOption(books.value, palette.value))

const backlog = computed(() => backlogStats(books.value))
const lagChart = computed(() => lagHistogramOption(backlog.value.lagBuckets, palette.value))

function composition(pick: (book: BookStats) => string | null): DonutSlice[] {
  const byKey = new Map<string, number>()
  for (const book of withLibrary.value) {
    const key = pick(book)
    if (key === null) continue
    byKey.set(key, (byKey.get(key) ?? 0) + 1)
  }
  return [...byKey.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))
}

const languageShare = computed(() => composition((b) => b.library?.language ?? 'unknown'))
const finishedShare = computed(() =>
  composition((b) => (b.finished ? 'finished' : b.totalMs > 0 ? 'in progress' : 'untouched')),
)
const partsShare = computed(() =>
  composition((b) =>
    b.library?.contentDeliveryType === 'MultiPartBook'
      ? 'multi-part'
      : b.library?.contentDeliveryType === 'SinglePartBook'
        ? 'single-part'
        : null,
  ),
)
const ownershipShare = computed(() =>
  composition((b) => (b.library?.ownership === 'Revoked' ? 'returned' : 'active')),
)

const totalLengthMs = computed(() =>
  withLibrary.value.reduce((sum, book) => sum + (book.bookLengthMs ?? 0), 0),
)
</script>

<template>
  <div class="space-y-10">
    <section>
      <p class="overline">№ 03 · Shelves</p>
      <div class="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 class="font-display text-3xl font-semibold tracking-tight text-ink-900 dark:text-paper-50">
          Library
        </h1>
        <p class="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400 dark:text-ink-500">
          {{ formatNumber(withLibrary.length) }} titles · {{ formatHours(totalLengthMs) }} of audio
        </p>
      </div>
    </section>

    <template v-if="libraryAvailability.available.value">
      <!-- Covers toggle -->
      <section class="panel flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <label class="flex cursor-pointer items-center gap-3">
          <span class="relative inline-flex">
            <input v-model="settings.loadRealCovers" type="checkbox" class="peer sr-only" />
            <span
              class="h-5 w-9 rounded-full bg-paper-300 transition-colors peer-checked:bg-accent-600 dark:bg-ink-700 dark:peer-checked:bg-accent-500"
            />
            <span
              class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4"
            />
          </span>
          <span class="text-sm font-medium text-ink-700 dark:text-ink-200">
            Load real cover art
          </span>
        </label>
        <p class="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400 dark:text-ink-500">
          off = private placeholders · on = sends ASINs to Audnexus + Amazon
        </p>
      </section>

      <!-- Table -->
      <section class="space-y-3">
        <div class="flex flex-wrap items-end justify-between gap-2">
          <SectionHeader title="Every title" :hint="`${formatNumber(filtered.length)} shown`" />
          <input
            v-model="query"
            type="search"
            placeholder="Search title, author, narrator…"
            class="w-full max-w-xs rounded-lg border border-paper-200 bg-white/70 px-3 py-1.5 text-sm text-ink-800 placeholder:text-ink-400 focus:border-accent-500 focus:outline-none dark:border-ink-800 dark:bg-ink-900/60 dark:text-ink-100 dark:placeholder:text-ink-500"
          />
        </div>

        <div class="panel overflow-x-auto">
          <table class="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr class="border-b border-paper-200 dark:border-ink-800">
                <th
                  v-for="column in ([
                    ['title', 'Title'],
                    ['length', 'Length'],
                    ['purchased', 'Purchased'],
                    ['listened', 'Listened'],
                    ['completion', 'Completion'],
                  ] as [SortKey, string][])"
                  :key="column[0]"
                  class="px-4 py-2.5"
                >
                  <button
                    type="button"
                    class="overline flex items-center gap-1 hover:text-ink-700 dark:hover:text-ink-200"
                    @click="setSort(column[0])"
                  >
                    {{ column[1] }}
                    <span v-if="sortKey === column[0]" class="text-accent-600 dark:text-accent-400">
                      {{ sortDesc ? '↓' : '↑' }}
                    </span>
                  </button>
                </th>
                <th class="overline px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-paper-200/60 dark:divide-ink-800/60">
              <tr v-for="book in visible" :key="book.key" class="align-middle">
                <td class="max-w-[320px] px-4 py-2">
                  <div class="flex items-center gap-3">
                    <BookCover :asin="book.asin" :title="book.title" class="w-9 text-[10px]" />
                    <div class="min-w-0">
                      <p class="truncate font-medium text-ink-800 dark:text-ink-100" :title="book.title">
                        {{ book.title }}
                      </p>
                      <p class="truncate text-xs text-ink-400 dark:text-ink-500">
                        {{ book.library?.authors.join(', ') || '—' }}
                        <template v-if="book.library?.narrators.length">
                          · read by {{ book.library.narrators.join(', ') }}
                        </template>
                      </p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-2 font-mono text-xs text-ink-500 dark:text-ink-400">
                  {{ book.bookLengthMs ? formatDuration(book.bookLengthMs) : '—' }}
                </td>
                <td class="px-4 py-2 font-mono text-xs text-ink-500 dark:text-ink-400">
                  {{ book.library?.purchaseDate ? formatDate(book.library.purchaseDate) : '—' }}
                </td>
                <td class="px-4 py-2 font-mono text-xs text-ink-700 dark:text-ink-200">
                  {{ book.totalMs > 0 ? formatDuration(book.totalMs) : '—' }}
                </td>
                <td class="px-4 py-2">
                  <div v-if="book.completion !== null" class="flex items-center gap-2">
                    <span class="h-1.5 w-20 overflow-hidden rounded-full bg-paper-200 dark:bg-ink-800">
                      <span
                        class="block h-full rounded-full bg-accent-500"
                        :style="{ width: `${Math.round(book.completion * 100)}%` }"
                      />
                    </span>
                    <span class="font-mono text-[11px] text-ink-500 dark:text-ink-400">
                      {{ formatPercent(book.completion) }}
                    </span>
                  </div>
                  <span v-else class="font-mono text-xs text-ink-300 dark:text-ink-600">—</span>
                </td>
                <td class="px-4 py-2">
                  <span
                    v-if="book.library?.ownership === 'Revoked'"
                    class="rounded-full bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] text-rose-600 dark:text-rose-400"
                  >
                    returned
                  </span>
                  <span
                    v-else-if="book.finished"
                    class="rounded-full bg-accent-600/10 px-2 py-0.5 font-mono text-[10px] text-accent-700 dark:bg-accent-400/10 dark:text-accent-300"
                  >
                    finished
                  </span>
                  <span
                    v-else-if="book.totalMs > 0"
                    class="rounded-full bg-paper-200/80 px-2 py-0.5 font-mono text-[10px] text-ink-500 dark:bg-ink-800/80 dark:text-ink-400"
                  >
                    in progress
                  </span>
                  <span
                    v-else
                    class="rounded-full border border-paper-200 px-2 py-0.5 font-mono text-[10px] text-ink-400 dark:border-ink-800 dark:text-ink-500"
                  >
                    untouched
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <button
          v-if="!showAll && filtered.length > PAGE"
          type="button"
          class="mx-auto block rounded-full px-4 py-1.5 font-mono text-[11px] text-accent-700 transition-colors hover:bg-accent-600/10 dark:text-accent-300"
          @click="showAll = true"
        >
          show all {{ formatNumber(filtered.length) }} titles
        </button>
      </section>

      <!-- Acquisition timeline -->
      <section class="space-y-3">
        <SectionHeader
          title="How the shelf grew"
          :hint="
            purchasesAvailability.available.value
              ? 'books per month, by payment'
              : 'payment split needs purchase data'
          "
        />
        <div class="panel p-3 sm:p-4">
          <BaseChart :option="acquisitions" :height="260" />
        </div>
      </section>

      <!-- Completion scatter -->
      <section class="space-y-3">
        <SectionHeader title="Length vs completion" hint="bubble size = hours listened" />
        <div class="panel p-3 sm:p-4">
          <BaseChart
            :option="scatter"
            :height="320"
            empty-title="No completion data"
            empty-message="Completion needs listening positions and book lengths."
          />
        </div>
      </section>

      <!-- Backlog -->
      <section class="space-y-3">
        <SectionHeader title="The backlog" hint="bought, never pressed play" />
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard
            label="On the shelf"
            :value="formatNumber(backlog.neverListened.length)"
            :sub="`${formatHours(backlog.backlogMs)} of unheard audio`"
          />
          <StatCard
            label="Median wait"
            :value="backlog.medianLagDays !== null ? `${formatNumber(backlog.medianLagDays)} days` : '—'"
            sub="purchase → first listen"
          />
          <StatCard
            label="Listened same week"
            :value="
              backlog.lagsDays.length > 0
                ? formatPercent(
                    backlog.lagsDays.filter((days) => days < 7).length / backlog.lagsDays.length,
                  )
                : '—'
            "
            sub="of books you started"
          />
        </div>
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="panel p-3 sm:p-4">
            <p class="overline px-2 pt-1 pb-2">Days on the shelf before first listen</p>
            <BaseChart :option="lagChart" :height="230" />
          </div>
          <div class="panel p-4 sm:p-5">
            <p class="overline pb-3">Longest-waiting unheard titles</p>
            <div class="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-6 xl:grid-cols-8">
              <div
                v-for="book in backlog.neverListened.slice(0, 16)"
                :key="book.key"
                :title="book.title"
              >
                <BookCover :asin="book.asin" :title="book.title" class="w-full text-xs" />
              </div>
            </div>
            <p v-if="backlog.neverListened.length === 0" class="text-sm text-ink-400">
              Nothing — you listen to everything you buy.
            </p>
          </div>
        </div>
      </section>

      <!-- Composition -->
      <section class="space-y-3">
        <SectionHeader title="Composition" hint="of your library" />
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div class="panel p-3">
            <p class="overline px-2 pt-1">Language</p>
            <BaseChart :option="languageShare.length ? donutOption(languageShare, palette) : null" :height="200" />
          </div>
          <div class="panel p-3">
            <p class="overline px-2 pt-1">Progress</p>
            <BaseChart :option="finishedShare.length ? donutOption(finishedShare, palette) : null" :height="200" />
          </div>
          <div class="panel p-3">
            <p class="overline px-2 pt-1">Parts</p>
            <BaseChart :option="partsShare.length ? donutOption(partsShare, palette) : null" :height="200" />
          </div>
          <div class="panel p-3">
            <p class="overline px-2 pt-1">Ownership</p>
            <BaseChart :option="ownershipShare.length ? donutOption(ownershipShare, palette) : null" :height="200" />
          </div>
        </div>
      </section>
    </template>

    <EmptyState
      v-else
      title="No library data in this takeout"
      message="The AudibleLibraryItemFactoryService folder is missing, so there are no shelves to show."
    />
  </div>
</template>
