# Audiotrail

**Your Audible history, visualized — entirely in your browser.**

Audible's GDPR data takeout is a zip full of CSV files: technically yours, practically
unreadable. Audiotrail turns it into an interactive dashboard — your listening rhythm
across the years, the books you abandoned at 90%, what a listening hour actually cost
you, and a yearly _Wrapped_ story to top it off.

## Privacy, in concrete terms

- **Nothing is uploaded.** The zip is parsed by JavaScript inside your tab
  (fflate + Papa Parse). There is no backend, no account, no analytics, no cookies.
- **Nothing is stored.** Close the tab and the data is gone; drop the zip again next
  time. `localStorage` holds only display preferences (dark mode, the covers toggle).
- **No third-party requests** — fonts are self-hosted, charts render locally. The one
  deliberate exception is the **opt-in** cover-art toggle (off by default). Audible
  artwork can't be addressed by ASIN directly, so enabling it sends each book's ASIN to
  the [Audnexus](https://audnex.us) API to resolve the cover, which then loads from
  Amazon's image CDN. Leave it off and you get deterministic generated placeholder
  covers instead.

## Get your takeout

1. Sign in to your Amazon / Audible account.
2. Go to _Manage your data_ → _Request your data_ → _Audible_.
3. Amazon emails you a download link. According to their notice this can take up to a
   month.
4. Drop the resulting `Audible.zip` onto Audiotrail.

Partial takeouts are fine — every page degrades gracefully and the upload screen
shows a "What we found" report of exactly which datasets were recognized.

## What you get

- **Overview** — hero stats, a GitHub-style listening heatmap, your all-time
  cumulative trail, top books, year-over-year deltas.
- **Listening** — daily/weekly/monthly rhythm with rolling averages, binge "eras"
  stacked by book, weekday patterns, session shapes, biggest days, listening habits.
- **Library** — a searchable, sortable shelf of every title with completion bars,
  acquisition timeline, length-vs-completion scatter, and your backlog (including how
  long books wait before you press play).
- **People** — author & narrator leaderboards, series progress, author eras, and a
  who-narrates-what sankey.
- **Money** — monthly spend, the full credit lifecycle (earned → spent / expired /
  active), effective cost per hour, what credits saved you, expiring-credit warnings.
- **Extras** — wishlist fates, search habits, click positions, devices and audio
  outputs, your custom collections.
- **Wrapped** — a scroll-snap year story: total hours, the book of your year, your
  biggest day, longest streak, the damage in euros.

## Development

```sh
mise install         # provision Node 24 + pnpm 11 (see mise.toml); or bring your own
pnpm install
pnpm dev           # start the dev server
pnpm test          # vitest unit + integration tests
pnpm build         # type-check (vue-tsc) + production build
```

Stack: Vue 3 + Vite + TypeScript, Tailwind CSS v4, Apache ECharts via vue-echarts,
fflate, Papa Parse. Three strictly separated layers: `lib/ingest` (zip → normalized
models, framework-free), `lib/derive` (pure aggregation functions), and the Vue
presentation layer. All parsing logic is unit-tested against synthetic fixtures —
never against real data.

### Local sample data

Put your own takeout at `data/Audible.zip` (the `data/` folder is gitignored) and the
dev server exposes a **dev-only** "load local sample" button. The middleware that
serves it exists only under `vite serve`, the loader is tree-shaken from production
builds, and tests that read it are skipped when the file is absent — real data can
never end up in the repository or a build.

## Out of scope (for now)

A bundled demo dataset, Web-Worker parsing for very large takeouts, share-card image
export from Wrapped, folder-drop ingestion, and persistent (IndexedDB) storage —
session-only by design for v1.

---

Audiotrail is an independent project and is not affiliated with, endorsed by, or
connected to Audible or Amazon. All trademarks belong to their owners.
