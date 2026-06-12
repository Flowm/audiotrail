<script setup lang="ts">
import DarkToggle from '@/components/ui/DarkToggle.vue'
import LogoMark from '@/components/ui/LogoMark.vue'
import TakeoutSteps from '@/components/ui/TakeoutSteps.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="flex items-center justify-between px-5 py-4 sm:px-8">
      <div class="flex items-center gap-2.5">
        <LogoMark class="h-8 w-8" />
        <span class="flex flex-col">
          <span class="font-display text-lg font-semibold tracking-tight text-ink-900 dark:text-paper-50">
            Audiotrail
          </span>
          <span class="font-mono text-[9px] uppercase tracking-[0.25em] text-ink-400 dark:text-ink-500">
            local · private
          </span>
        </span>
      </div>
      <div class="flex items-center gap-3">
        <RouterLink
          to="/about"
          class="text-sm font-medium text-ink-600 underline-offset-4 hover:underline dark:text-ink-300"
        >
          About
        </RouterLink>
        <DarkToggle />
      </div>
    </header>

    <main class="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-5 pt-10 pb-16 sm:pt-16">
      <p class="overline">Your private listening report</p>
      <h1
        class="mt-3 text-center font-display text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl dark:text-paper-50"
      >
        Years of listening,<br />
        <span class="text-accent-600 dark:text-accent-400">none of it leaves this tab.</span>
      </h1>
      <p class="mt-5 max-w-lg text-center text-[15px] leading-relaxed text-ink-500 dark:text-ink-400">
        Audiotrail turns your Audible data takeout into an interactive dashboard — parsed entirely
        in your browser. No uploads, no servers, no tracking.
      </p>

      <div
        class="panel mt-10 flex w-full flex-col items-center gap-3 border-2 border-dashed px-6 py-12"
      >
        <svg
          class="h-10 w-10 text-ink-300 dark:text-ink-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
        <p class="text-sm font-medium text-ink-700 dark:text-ink-200">
          Drop <code class="rounded bg-paper-200/70 px-1 py-0.5 font-mono text-[12px] dark:bg-ink-800">Audible.zip</code> here
        </p>
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 dark:text-ink-500">
          ingestion lands in phase 1
        </p>
      </div>

      <div class="mt-6 flex flex-wrap items-center justify-center gap-2">
        <span
          v-for="chip in ['No uploads', 'No accounts', 'No analytics', 'Nothing stored']"
          :key="chip"
          class="rounded-full border border-paper-200 bg-white/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500 dark:border-ink-800 dark:bg-ink-900/60 dark:text-ink-400"
        >
          {{ chip }}
        </span>
      </div>

      <details class="panel group mt-10 w-full px-6 py-5">
        <summary
          class="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-ink-700 dark:text-ink-200"
        >
          How do I get my data?
          <svg
            class="h-4 w-4 text-ink-400 transition-transform group-open:rotate-180"
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
    </main>

    <footer class="px-5 pb-6 text-center">
      <p class="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400 dark:text-ink-600">
        Open source · not affiliated with Audible or Amazon
      </p>
    </footer>
  </div>
</template>
