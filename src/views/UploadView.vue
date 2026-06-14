<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import DarkToggle from "@/components/ui/DarkToggle.vue";
import LoadReportPanel from "@/components/ui/LoadReportPanel.vue";
import LogoMark from "@/components/ui/LogoMark.vue";
import TakeoutSteps from "@/components/ui/TakeoutSteps.vue";
import { useTakeoutStore } from "@/stores/takeout";

const takeout = useTakeoutStore();
const router = useRouter();

const isDev = import.meta.env.DEV;
const dragOver = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const busy = computed(() => takeout.phase === "reading" || takeout.phase === "parsing");
const showDropzone = computed(() => !busy.value && takeout.phase !== "ready");

function onDrop(event: DragEvent): void {
  dragOver.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) void takeout.loadFromFile(file);
}

function onPick(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) void takeout.loadFromFile(file);
  input.value = "";
}

async function loadSample(): Promise<void> {
  if (!import.meta.env.DEV) return;
  const { loadDevSample } = await import("@/dev/autoload");
  await loadDevSample(takeout);
}

function openDashboard(): void {
  void router.push({ name: "overview" });
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="flex items-center justify-between px-5 py-4 sm:px-8">
      <div class="flex items-center gap-2.5">
        <LogoMark class="h-8 w-8" />
        <span class="flex flex-col">
          <span class="font-display text-ink-900 dark:text-paper-50 text-lg font-semibold tracking-tight"> Audiotrail </span>
          <span class="text-ink-400 dark:text-ink-500 font-mono text-[9px] tracking-[0.25em] uppercase"> local · private </span>
        </span>
      </div>
      <div class="flex items-center gap-3">
        <RouterLink to="/about" class="text-ink-600 dark:text-ink-300 text-sm font-medium underline-offset-4 hover:underline"> About </RouterLink>
        <DarkToggle />
      </div>
    </header>

    <main class="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-5 pt-10 pb-16 sm:pt-16">
      <p class="overline">Your private listening report</p>
      <h1 class="font-display text-ink-900 dark:text-paper-50 mt-3 text-center text-4xl font-semibold tracking-tight sm:text-5xl">
        Years of listening,<br />
        <span class="text-accent-600 dark:text-accent-400">none of it leaves this tab.</span>
      </h1>
      <p class="text-ink-500 dark:text-ink-400 mt-5 max-w-lg text-center text-[15px] leading-relaxed">
        Audiotrail turns your Audible data takeout into an interactive dashboard — parsed entirely in your browser. No uploads, no servers, no tracking.
      </p>

      <!-- Drop zone -->
      <div
        v-if="showDropzone"
        :class="[
          'panel mt-10 flex w-full cursor-pointer flex-col items-center gap-3 border-2 border-dashed px-6 py-12 transition-colors',
          dragOver ? 'border-accent-500 bg-accent-600/5 dark:bg-accent-400/5' : 'hover:border-ink-300 dark:hover:border-ink-600',
        ]"
        role="button"
        tabindex="0"
        aria-label="Drop your Audible.zip or browse for it"
        @click="fileInput?.click()"
        @keydown.enter="fileInput?.click()"
        @keydown.space.prevent="fileInput?.click()"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop.prevent="onDrop"
      >
        <svg
          class="text-ink-300 dark:text-ink-600 h-10 w-10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
        <p class="text-ink-700 dark:text-ink-200 text-sm font-medium">
          Drop
          <code class="bg-paper-200/70 dark:bg-ink-800 rounded px-1 py-0.5 font-mono text-[12px]">Audible.zip</code>
          here — or click to browse
        </p>
        <p class="text-ink-400 dark:text-ink-500 font-mono text-[10px] tracking-[0.2em] uppercase">parsed locally · nothing uploaded</p>
        <input ref="fileInput" type="file" accept=".zip,application/zip" class="hidden" @change="onPick" />
      </div>

      <p
        v-if="takeout.phase === 'error' && takeout.error"
        class="mt-4 w-full rounded-xl border border-rose-300/60 bg-rose-50/70 px-4 py-3 text-center text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300"
      >
        {{ takeout.error }}
      </p>

      <!-- Parse progress -->
      <div v-if="busy" class="panel mt-10 w-full px-6 py-10 text-center">
        <svg
          class="text-accent-600 dark:text-accent-400 mx-auto h-8 w-8 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M21 12a9 9 0 1 1-6.2-8.56" />
        </svg>
        <p class="text-ink-700 dark:text-ink-200 mt-4 text-sm font-medium">
          {{ takeout.phase === "reading" ? "Reading zip…" : "Parsing your takeout…" }}
        </p>
        <p class="text-ink-400 dark:text-ink-500 mt-1 font-mono text-[11px] tracking-[0.16em] uppercase">
          <template v-if="takeout.progress?.datasetLabel"> {{ takeout.progress.datasetLabel }} ({{ takeout.progress.index + 1 }}/{{ takeout.progress.total }}) </template>
          <template v-else>working…</template>
        </p>
      </div>

      <!-- Result -->
      <div v-if="takeout.phase === 'ready' && takeout.report" class="mt-10 w-full space-y-4">
        <LoadReportPanel :report="takeout.report" />
        <div class="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            class="bg-accent-600 hover:bg-accent-700 dark:bg-accent-500 dark:text-ink-950 dark:hover:bg-accent-400 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-colors"
            @click="openDashboard"
          >
            Open the dashboard →
          </button>
          <button
            type="button"
            class="text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-100 rounded-full px-4 py-2.5 text-sm font-medium transition-colors"
            @click="takeout.clear()"
          >
            Load a different zip
          </button>
        </div>
      </div>

      <template v-if="showDropzone">
        <button
          v-if="isDev"
          type="button"
          class="border-accent-400/60 text-accent-700 hover:bg-accent-600/10 dark:text-accent-300 mt-4 rounded-full border border-dashed px-4 py-1.5 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors"
          @click="loadSample"
        >
          dev · load local sample
        </button>

        <div class="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span
            v-for="chip in ['No uploads', 'No accounts', 'No analytics', 'Nothing stored']"
            :key="chip"
            class="border-paper-200 text-ink-500 dark:border-ink-800 dark:bg-ink-900/60 dark:text-ink-400 rounded-full border bg-white/60 px-3 py-1 font-mono text-[10px] tracking-[0.16em] uppercase"
          >
            {{ chip }}
          </span>
        </div>

        <details class="panel group mt-10 w-full px-6 py-5">
          <summary class="text-ink-700 dark:text-ink-200 flex cursor-pointer list-none items-center justify-between text-sm font-medium">
            How do I get my data?
            <svg
              class="text-ink-400 h-4 w-4 transition-transform group-open:rotate-180"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <div class="mt-5">
            <TakeoutSteps />
          </div>
        </details>
      </template>
    </main>

    <footer class="px-5 pb-6 text-center">
      <p class="text-ink-400 dark:text-ink-600 font-mono text-[10px] tracking-[0.18em] uppercase">Open source · not affiliated with Audible or Amazon</p>
    </footer>
  </div>
</template>
