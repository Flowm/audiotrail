<script setup lang="ts">
import { computed } from "vue";

import BaseChart from "@/components/charts/BaseChart.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import SectionHeader from "@/components/ui/SectionHeader.vue";
import StatCard from "@/components/ui/StatCard.vue";
import { useChartTheme } from "@/composables/useChartTheme";
import { useDataset } from "@/composables/useDataset";
import { donutOption } from "@/lib/charts/donut";
import { clickPositionOption } from "@/lib/charts/extras";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { useTakeoutStore } from "@/stores/takeout";

const takeout = useTakeoutStore();
const palette = useChartTheme();

const wishlistAvailability = useDataset("wishlist");
const searchAvailability = useDataset("searchSessions");
const hitsAvailability = useDataset("searchHits");
const devicesAvailability = useDataset("devices");
const playbackAvailability = useDataset("playback");
const collectionsAvailability = useDataset("collections");

const wishlist = computed(() => takeout.bundle?.wishlist ?? []);
const searchSessions = computed(() => takeout.bundle?.searchSessions ?? []);
const searchHits = computed(() => takeout.bundle?.searchHits ?? []);
const devices = computed(() => takeout.bundle?.devices ?? []);
const playback = computed(() => takeout.bundle?.playback ?? []);
const collections = computed(() => takeout.bundle?.collections ?? []);
const collectionItems = computed(() => takeout.bundle?.collectionItems ?? []);

// ----- wishlist --------------------------------------------------------------

const wishlistFunnel = computed(() => {
  const added = wishlist.value.length;
  const purchased = wishlist.value.filter((w) => w.status === "Wishlist Item Purchased").length;
  const deleted = wishlist.value.filter((w) => w.status === "Wishlist Item Deleted" || (w.deleteDate !== null && w.status !== "Wishlist Item Purchased")).length;
  const waiting = added - purchased - deleted;
  return { added, purchased, deleted, waiting: Math.max(0, waiting) };
});

const survivors = computed(() => wishlist.value.filter((w) => w.status === "Wishlist Item Added" && w.deleteDate === null).sort((a, b) => (a.addDate < b.addDate ? -1 : 1)));

const DAY_MS = 86_400_000;
const survivorAges = computed(() => {
  const now = Date.now();
  return survivors.value.map((w) => Math.floor((now - Date.parse(`${w.addDate}T00:00:00Z`)) / DAY_MS)).sort((a, b) => a - b);
});
const medianWishAge = computed(() => {
  const ages = survivorAges.value;
  if (ages.length === 0) return null;
  return ages.length % 2 === 1 ? ages[(ages.length - 1) / 2]! : Math.round((ages[ages.length / 2 - 1]! + ages[ages.length / 2]!) / 2);
});

// ----- search ----------------------------------------------------------------

const searchTotals = computed(() => {
  const sessions = searchSessions.value;
  const total = sessions.length;
  const clicked = sessions.filter((s) => s.clicked === true || s.clickCount > 0).length;
  const purchased = sessions.filter((s) => s.orderCount > 0 || s.paidPurchases > 0).length;
  return { total, clicked, purchased };
});

const topKeywords = computed(() => {
  const byKeyword = new Map<string, { searches: number; clicked: boolean }>();
  for (const session of searchSessions.value) {
    if (session.keywords === null) continue;
    const key = session.keywords.toLowerCase();
    const entry = byKeyword.get(key);
    if (entry) {
      entry.searches += session.searchCount || 1;
      entry.clicked = entry.clicked || session.clicked === true;
    } else {
      byKeyword.set(key, { searches: session.searchCount || 1, clicked: session.clicked === true });
    }
  }
  return [...byKeyword.entries()]
    .map(([keyword, entry]) => ({ keyword, ...entry }))
    .sort((a, b) => b.searches - a.searches)
    .slice(0, 12);
});

const positionChart = computed(() => clickPositionOption(searchHits.value, palette.value));

// ----- devices & playback ----------------------------------------------------

const outputShare = computed(() => {
  const byOutput = new Map<string, number>();
  for (const event of playback.value) {
    if (event.audioOutput === null) continue;
    byOutput.set(event.audioOutput, (byOutput.get(event.audioOutput) ?? 0) + 1);
  }
  return [...byOutput.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
});

const playbackRange = computed(() => {
  if (playback.value.length === 0) return null;
  return {
    from: playback.value[0]!.time,
    to: playback.value[playback.value.length - 1]!.time,
  };
});

// ----- collections -----------------------------------------------------------

const userCollections = computed(() => {
  const infos = collections.value.filter((c) => !c.isSystem);
  return infos.map((info) => ({
    info,
    items: collectionItems.value.filter((item) => item.collectionId === info.id && item.isDeleted !== true),
  }));
});

const anythingAvailable = computed(
  () => wishlistAvailability.available.value || searchAvailability.available.value || devicesAvailability.available.value || collectionsAvailability.available.value,
);
</script>

<template>
  <div class="space-y-10">
    <section>
      <p class="overline">№ 06 · Marginalia</p>
      <h1 class="font-display text-ink-900 dark:text-paper-50 mt-2 text-3xl font-semibold tracking-tight">Extras</h1>
    </section>

    <template v-if="anythingAvailable">
      <!-- Wishlist -->
      <section v-if="wishlistAvailability.available.value" class="space-y-3">
        <SectionHeader title="Wishlist fates" :hint="`${formatNumber(wishlistFunnel.added)} wishes ever made`" />
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Added" :value="formatNumber(wishlistFunnel.added)" />
          <StatCard
            label="Purchased"
            :value="formatNumber(wishlistFunnel.purchased)"
            :sub="wishlistFunnel.added > 0 ? formatPercent(wishlistFunnel.purchased / wishlistFunnel.added) + ' conversion' : null"
          />
          <StatCard label="Deleted" :value="formatNumber(wishlistFunnel.deleted)" />
          <StatCard label="Still waiting" :value="formatNumber(wishlistFunnel.waiting)" :sub="medianWishAge !== null ? `median age ${formatNumber(medianWishAge)} days` : null" />
        </div>
        <div v-if="survivors.length > 0" class="panel px-5 py-4">
          <p class="pb-3 overline">Longest-waiting wishes</p>
          <div class="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
            <div v-for="wish in survivors.slice(0, 10)" :key="wish.asin ?? wish.addDate" class="flex items-baseline justify-between gap-3 text-sm">
              <span class="text-ink-700 dark:text-ink-200 min-w-0 flex-1 truncate" :title="wish.productName ?? undefined">
                {{ wish.productName ?? "Unknown title" }}
              </span>
              <span class="text-ink-400 dark:text-ink-500 shrink-0 font-mono text-[11px]"> since {{ formatDate(wish.addDate) }} </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Search -->
      <section v-if="searchAvailability.available.value" class="space-y-3">
        <SectionHeader title="Search habits" hint="from your store searches" />
        <div class="grid grid-cols-3 gap-3">
          <StatCard label="Search sessions" :value="formatNumber(searchTotals.total)" />
          <StatCard label="Led to a click" :value="searchTotals.total > 0 ? formatPercent(searchTotals.clicked / searchTotals.total) : '—'" />
          <StatCard label="Led to an order" :value="searchTotals.total > 0 ? formatPercent(searchTotals.purchased / searchTotals.total) : '—'" />
        </div>
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="panel px-5 py-4">
            <p class="pb-3 overline">What you searched for</p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="entry in topKeywords"
                :key="entry.keyword"
                class="border-paper-200 text-ink-600 dark:border-ink-800 dark:bg-ink-900/60 dark:text-ink-300 rounded-full border bg-white/60 px-2.5 py-1 text-xs"
              >
                {{ entry.keyword }}
                <span class="text-ink-400 dark:text-ink-500 font-mono text-[10px]">×{{ entry.searches }}</span>
              </span>
            </div>
          </div>
          <div v-if="hitsAvailability.available.value" class="panel p-3 sm:p-4">
            <p class="px-2 pt-1 pb-2 overline">Which result you click</p>
            <BaseChart :option="positionChart" :height="220" />
          </div>
        </div>
      </section>

      <!-- Devices -->
      <section v-if="devicesAvailability.available.value || playbackAvailability.available.value" class="space-y-3">
        <SectionHeader title="Hardware" hint="players & outputs" />
        <div class="grid gap-3 lg:grid-cols-2">
          <div v-if="devices.length > 0" class="panel px-5 py-4">
            <p class="pb-3 overline">Device activations</p>
            <div class="space-y-2">
              <div v-for="(device, index) in devices" :key="index" class="flex items-baseline justify-between gap-3 text-sm">
                <span class="text-ink-700 dark:text-ink-200 min-w-0 flex-1 truncate"> {{ device.manufacturer ?? "?" }} · {{ device.model ?? "unknown model" }} </span>
                <span class="text-ink-400 dark:text-ink-500 shrink-0 font-mono text-[11px]">
                  {{ formatDate(device.firstActivatedAt) }} — {{ formatDate(device.lastActivatedAt) }}
                </span>
              </div>
            </div>
          </div>
          <div v-if="outputShare.length > 0" class="panel p-3 sm:p-4">
            <p class="px-2 pt-1 overline">
              Where the sound goes
              <span v-if="playbackRange" class="tracking-normal normal-case"> · {{ formatDate(playbackRange.from) }} – {{ formatDate(playbackRange.to) }} sample only </span>
            </p>
            <BaseChart :option="donutOption(outputShare, palette, (v) => `${formatNumber(v)} events`)" :height="230" />
          </div>
        </div>
      </section>

      <!-- Collections -->
      <section v-if="collectionsAvailability.available.value && userCollections.length > 0" class="space-y-3">
        <SectionHeader title="Your collections" :hint="`${userCollections.length} custom shelves`" />
        <div class="grid gap-3 sm:grid-cols-2">
          <div v-for="entry in userCollections" :key="entry.info.id" class="panel px-5 py-4">
            <div class="flex items-baseline justify-between gap-3">
              <p class="font-display text-ink-900 dark:text-paper-50 text-base font-semibold">
                {{ entry.info.name ?? "Untitled collection" }}
              </p>
              <span class="text-ink-400 dark:text-ink-500 font-mono text-[11px]"> {{ entry.items.length }} titles </span>
            </div>
            <p v-if="entry.info.description" class="text-ink-500 dark:text-ink-400 mt-1 text-xs">
              {{ entry.info.description }}
            </p>
            <p class="text-ink-500 dark:text-ink-400 mt-2 line-clamp-2 text-xs leading-relaxed">
              {{
                entry.items
                  .map((item) => item.productName)
                  .filter(Boolean)
                  .join(" · ")
              }}
            </p>
          </div>
        </div>
      </section>
    </template>

    <EmptyState v-else title="No extras in this takeout" message="Wishlist, search, device and collection files are all missing." />
  </div>
</template>
