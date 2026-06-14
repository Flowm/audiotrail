<script setup lang="ts">
import TakeoutSteps from "@/components/ui/TakeoutSteps.vue";

const datasets: Array<{ name: string; blurb: string }> = [
  { name: "Listening", blurb: "Every listening session, day by day — duration, position, device context." },
  { name: "Library", blurb: "Every title you own: authors, narrators, series, language, length." },
  { name: "Purchases", blurb: "Each order line — list price, discount, credit vs cash." },
  { name: "Credits", blurb: "Each credit's lifecycle: earned, spent, expired, still waiting." },
  { name: "Membership billings", blurb: "What your subscription actually charged, month by month." },
  { name: "Membership events", blurb: "Trial starts, plan switches and other account milestones." },
  { name: "Wishlist", blurb: "Wishes added, fulfilled, deleted — and how long they waited." },
  { name: "Collections", blurb: "Your shelves, both your own and the built-in system ones." },
  { name: "Search sessions", blurb: "What you searched for, and whether you clicked or bought." },
  { name: "Search results", blurb: "Which result positions you actually clicked." },
  { name: "Playback metrics", blurb: "A recent technical sample: audio output, app events, playback state." },
  { name: "Cart history", blurb: "What passed through your basket on the way to checkout." },
  { name: "Returns", blurb: "Titles you sent back and the credits refunded." },
  { name: "Device activations", blurb: "The players and apps registered to your account." },
  { name: "Adobe impressions", blurb: "In-app merchandising telemetry (carousels you scrolled past)." },
  { name: "Account attributes", blurb: "Member since, region, customer segment." },
];
</script>

<template>
  <div class="space-y-14">
    <section>
      <p class="overline">About</p>
      <h1 class="font-display text-ink-900 dark:text-paper-50 mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">A private window into your listening</h1>
      <p class="text-ink-600 dark:text-ink-300 mt-5 max-w-2xl text-[15px] leading-relaxed">
        Audible's GDPR data takeout is a zip full of CSV files — technically yours, practically unreadable. Audiotrail turns it into something you can actually explore: your
        listening rhythm over the years, the books you abandoned at 90%, what a listening hour really cost you. It is a static web page with no backend; the analysis runs entirely
        on your machine.
      </p>
    </section>

    <section>
      <p class="overline">Privacy, in concrete terms</p>
      <ul class="text-ink-600 dark:text-ink-300 mt-4 max-w-2xl space-y-3 text-sm leading-relaxed">
        <li class="flex gap-3">
          <span class="bg-accent-500 mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
          Your zip is read and parsed by JavaScript inside this tab. No byte of it is ever uploaded — there is no server to upload to.
        </li>
        <li class="flex gap-3">
          <span class="bg-accent-500 mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
          No analytics, no cookies. The browser's localStorage holds only display preferences (dark mode, the cover-art toggle) — never your data.
        </li>
        <li class="flex gap-3">
          <span class="bg-accent-500 mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
          Nothing persists. Close the tab and everything is gone; re-drop the zip next time.
        </li>
        <li class="flex gap-3">
          <span class="bg-accent-500 mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
          One deliberate exception: an opt-in toggle (off by default) can load real cover art. Because Audible artwork can't be addressed by ASIN directly, enabling it sends each
          book's ASIN to <a href="https://audnex.us" target="_blank" rel="noopener" class="underline underline-offset-2">Audnexus</a>
          (a community Audible-metadata API) to look up the cover, which then loads from Amazon's image CDN — so both Audnexus and Amazon see your library's book IDs. Leave it off
          and you get generated placeholder covers instead.
        </li>
      </ul>
    </section>

    <section>
      <p class="overline">Get your takeout</p>
      <div class="mt-4 max-w-2xl">
        <TakeoutSteps />
      </div>
    </section>

    <section>
      <p class="overline">What's inside the takeout</p>
      <dl class="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <div v-for="dataset in datasets" :key="dataset.name">
          <dt class="text-ink-800 dark:text-ink-100 text-sm font-semibold">{{ dataset.name }}</dt>
          <dd class="text-ink-500 dark:text-ink-400 mt-0.5 text-[13px] leading-relaxed">
            {{ dataset.blurb }}
          </dd>
        </div>
      </dl>
    </section>

    <section>
      <p class="overline">Colophon</p>
      <p class="text-ink-600 dark:text-ink-300 mt-4 max-w-2xl text-sm leading-relaxed">
        Built with Vue 3, Vite, Tailwind CSS and Apache ECharts; zips are opened with JSZip and CSVs parsed with Papa Parse. Type is set in Fraunces, Schibsted Grotesk and IBM Plex
        Mono, self-hosted so the app makes no font-CDN requests. Opt-in cover art is resolved through the Audnexus API. Audiotrail is an independent project and is not affiliated
        with, endorsed by, or connected to Audible or Amazon; all trademarks belong to their owners.
      </p>
    </section>
  </div>
</template>
