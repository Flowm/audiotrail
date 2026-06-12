<script setup lang="ts">
import { computed } from 'vue'

import BaseChart from '@/components/charts/BaseChart.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import StatCard from '@/components/ui/StatCard.vue'
import { useChartTheme } from '@/composables/useChartTheme'
import { useDataset } from '@/composables/useDataset'
import { costPerHourOption, monthlySpendOption } from '@/lib/charts/money'
import { sankeyOption } from '@/lib/charts/sankey'
import {
  costPerYear,
  creditFlow,
  creditSankeyData,
  creditsSavings,
  expiringCredits,
  monthlySpend,
  unusedActiveCredits,
} from '@/lib/derive/money'
import { formatDate, formatEur, formatNumber } from '@/lib/format'
import { useTakeoutStore } from '@/stores/takeout'

const takeout = useTakeoutStore()
const palette = useChartTheme()
const billingsAvailability = useDataset('billings')
const purchasesAvailability = useDataset('purchases')
const creditsAvailability = useDataset('credits')

const billings = computed(() => takeout.bundle?.billings ?? [])
const purchases = computed(() => takeout.bundle?.purchases ?? [])
const credits = computed(() => takeout.bundle?.credits ?? [])
const returns = computed(() => takeout.bundle?.returns ?? [])

const hasMoney = computed(
  () => billingsAvailability.available.value || purchasesAvailability.available.value,
)

const spendRows = computed(() => monthlySpend(billings.value, purchases.value))
const totalSpend = computed(() =>
  spendRows.value.reduce((sum, row) => sum + row.membership + row.cash, 0),
)
const spendChart = computed(() => monthlySpendOption(spendRows.value, palette.value))

const flow = computed(() => creditFlow(credits.value))
const creditChart = computed(() =>
  credits.value.length > 0
    ? sankeyOption(creditSankeyData(flow.value), palette.value, (value) =>
        `${formatNumber(value)} credit${value === 1 ? '' : 's'}`,
      )
    : null,
)

const years = computed(() =>
  costPerYear(billings.value, purchases.value, takeout.days, takeout.bookStats.books),
)
const costChart = computed(() => costPerHourOption(years.value, palette.value))
const lifetimeCostPerHour = computed(() => {
  const spend = years.value.reduce((sum, year) => sum + year.spend, 0)
  const hours = years.value.reduce((sum, year) => sum + year.hours, 0)
  return hours > 0 ? spend / hours : null
})

const savings = computed(() => creditsSavings(purchases.value, billings.value))

const expiring = computed(() => expiringCredits(credits.value, Date.now(), 90))
const activeCredits = computed(() => unusedActiveCredits(credits.value))
</script>

<template>
  <div class="space-y-10">
    <section>
      <p class="overline">№ 05 · The ledger</p>
      <div class="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 class="font-display text-3xl font-semibold tracking-tight text-ink-900 dark:text-paper-50">
          Money
        </h1>
        <p class="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400 dark:text-ink-500">
          all amounts in EUR
        </p>
      </div>
    </section>

    <template v-if="hasMoney || creditsAvailability.available.value">
      <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Lifetime spend"
          :value="hasMoney ? formatEur(totalSpend) : '—'"
          sub="membership + shop"
        />
        <StatCard
          label="Cost per hour"
          :value="lifetimeCostPerHour !== null ? formatEur(lifetimeCostPerHour) : '—'"
          sub="lifetime average"
        />
        <StatCard
          label="Credits earned"
          :value="creditsAvailability.available.value ? formatNumber(flow.total) : '—'"
          :sub="
            creditsAvailability.available.value
              ? `${formatNumber(flow.consumed)} spent · ${formatNumber(flow.expired)} expired`
              : null
          "
        />
        <StatCard
          label="Credits unused"
          :value="creditsAvailability.available.value ? formatNumber(activeCredits) : '—'"
          :sub="expiring.length > 0 ? `${expiring.length} expiring within 90 days` : 'none expiring soon'"
        />
      </section>

      <section v-if="hasMoney" class="space-y-3">
        <SectionHeader title="What it cost" hint="per month, with running total" />
        <div class="panel p-3 sm:p-4">
          <BaseChart :option="spendChart" :height="300" />
        </div>
      </section>

      <section v-if="creditsAvailability.available.value" class="space-y-3">
        <SectionHeader
          title="Credit lifecycle"
          :hint="`${formatNumber(flow.total)} earned = ${formatNumber(flow.consumed)} spent + ${formatNumber(flow.expired)} expired + ${formatNumber(flow.active)} active`"
        />
        <div class="panel p-3 sm:p-4">
          <BaseChart :option="creditChart" :height="360" />
        </div>
      </section>

      <section v-if="hasMoney" class="grid gap-6 lg:grid-cols-5">
        <div class="space-y-3 lg:col-span-3">
          <SectionHeader title="Cost per hour" hint="spend ÷ hours listened, per year" />
          <div class="panel p-3 sm:p-4">
            <BaseChart :option="costChart" :height="280" />
          </div>
        </div>
        <div class="space-y-3 lg:col-span-2">
          <SectionHeader title="Did credits pay off?" hint="list price vs what you paid" />
          <div class="panel flex h-full flex-col justify-center gap-3 px-6 py-6">
            <p class="font-display text-3xl font-semibold tracking-tight text-ink-900 dark:text-paper-50">
              <template v-if="savings.saved >= 0">
                {{ formatEur(savings.saved) }} saved
              </template>
              <template v-else>{{ formatEur(-savings.saved) }} overpaid</template>
            </p>
            <div class="space-y-1.5 text-sm text-ink-600 dark:text-ink-300">
              <p class="flex justify-between gap-4">
                <span>{{ formatNumber(savings.creditPurchaseCount) }} books at list price</span>
                <span class="font-mono">{{ formatEur(savings.valueAtListPrice) }}</span>
              </p>
              <p class="flex justify-between gap-4">
                <span>membership paid</span>
                <span class="font-mono">−{{ formatEur(savings.membershipCost) }}</span>
              </p>
              <p v-if="savings.creditPackCost > 0" class="flex justify-between gap-4">
                <span>extra credit packs</span>
                <span class="font-mono">−{{ formatEur(savings.creditPackCost) }}</span>
              </p>
            </div>
            <p class="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400 dark:text-ink-500">
              compares credit-bought books against their list prices
            </p>
          </div>
        </div>
      </section>

      <section
        v-if="expiring.length > 0 || returns.length > 0"
        class="grid gap-6 lg:grid-cols-2"
      >
        <div v-if="expiring.length > 0" class="space-y-3">
          <SectionHeader title="Use them or lose them" hint="credits expiring soon" />
          <div class="panel divide-y divide-paper-200/70 px-5 dark:divide-ink-800/70">
            <div v-for="credit in expiring" :key="credit.issueDate + (credit.expireDate ?? '')" class="flex items-baseline justify-between gap-4 py-2.5">
              <span class="text-sm text-ink-700 dark:text-ink-200">
                1 credit · {{ credit.reason ?? 'unknown origin' }}
              </span>
              <span class="font-mono text-xs text-rose-600 dark:text-rose-400">
                expires {{ formatDate(credit.expireDate) }}
              </span>
            </div>
          </div>
        </div>
        <div v-if="returns.length > 0" class="space-y-3">
          <SectionHeader title="Returns" :hint="`${returns.length} titles sent back`" />
          <div class="panel divide-y divide-paper-200/70 px-5 dark:divide-ink-800/70">
            <div v-for="(entry, index) in returns" :key="index" class="py-2.5">
              <div class="flex items-baseline justify-between gap-4">
                <span class="min-w-0 flex-1 truncate text-sm text-ink-700 dark:text-ink-200" :title="entry.productName ?? undefined">
                  {{ entry.productName ?? 'Unknown title' }}
                </span>
                <span class="shrink-0 font-mono text-xs text-ink-500 dark:text-ink-400">
                  {{ formatDate(entry.returnDate) }}
                </span>
              </div>
              <p class="mt-0.5 font-mono text-[11px] text-ink-400 dark:text-ink-500">
                <template v-if="entry.creditsRefunded">
                  {{ entry.creditsRefunded }} credit refunded
                </template>
                <template v-else-if="entry.price">{{ formatEur(entry.price) }} refunded</template>
              </p>
            </div>
          </div>
        </div>
      </section>
    </template>

    <EmptyState
      v-else
      title="No money data in this takeout"
      message="Billing, purchase and credit files are all missing — nothing to account for."
    />
  </div>
</template>
