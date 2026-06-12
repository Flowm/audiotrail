import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import JSZip from 'jszip'
import Papa from 'papaparse'
import { describe, expect, it } from 'vitest'

import { ingestTakeout } from '@/lib/ingest'
import { zipProvider } from '@/lib/ingest/zip'

/**
 * Smoke test against the developer's own gitignored sample takeout. Skipped
 * everywhere the sample doesn't exist (CI, fresh clones). Assertions compare
 * two independent computation paths — no real values are hardcoded here.
 */
const zipPath = fileURLToPath(new URL('../../data/Audible.zip', import.meta.url))

describe.skipIf(!existsSync(zipPath))('real takeout smoke (local sample only)', () => {
  it('matches an independent raw pass over the listening CSVs', async () => {
    const data = new Uint8Array(readFileSync(zipPath))
    const { bundle, report } = await ingestTakeout(await zipProvider(data))

    const zip = await JSZip.loadAsync(data)
    const listeningPaths = Object.keys(zip.files).filter((path) =>
      /Audible\.Listening\/[^/]+\/Listening\.csv$/.test(path),
    )

    let rawRows = 0
    let rawDurationSum = 0
    for (const path of listeningPaths) {
      const text = (await zip.file(path)!.async('string')).replace(/^﻿/, '')
      const parsed = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' })
      const rows = parsed.data.slice(1)
      rawRows += rows.length
      for (const row of rows) rawDurationSum += Number(row[2]) || 0
    }

    expect(bundle.profiles).toHaveLength(listeningPaths.length)
    expect(bundle.listening).toHaveLength(rawRows)
    expect(bundle.listening.reduce((sum, s) => sum + s.durationMs, 0)).toBe(rawDurationSum)

    const statusOf = (key: string) => report.datasets.find((d) => d.key === key)!
    expect(statusOf('listening').status).toBe('loaded')
    expect(statusOf('library').status).toBe('loaded')
    expect(statusOf('account').status).toBe('loaded')

    // merged library has unique ASINs
    expect(new Set(bundle.library.map((item) => item.asin)).size).toBe(bundle.library.length)
    expect(bundle.library.length).toBeGreaterThan(0)

    console.log(
      '[smoke]',
      JSON.stringify({
        listeningRows: bundle.listening.length,
        profiles: bundle.profiles.length,
        libraryTitles: bundle.library.length,
        totalListeningHours:
          Math.round((bundle.listening.reduce((sum, s) => sum + s.durationMs, 0) / 3.6e6) * 10) /
          10,
        parseMs: report.durationMs,
      }),
    )
  })
})
