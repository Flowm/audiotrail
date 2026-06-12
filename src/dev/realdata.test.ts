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

    // Independent pass: parse positionally and deduplicate multipart echo
    // rows (identical identity tuple, name differing only by ' Part N').
    const seen = new Set<string>()
    let rawRows = 0
    let dedupedRows = 0
    let dedupedDurationSum = 0
    for (const path of listeningPaths) {
      const profile = path.split('/').at(-2) ?? '?'
      const text = (await zip.file(path)!.async('string')).replace(/^﻿/, '')
      const parsed = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' })
      for (const row of parsed.data.slice(1)) {
        rawRows += 1
        const asin = row[6] && row[6] !== 'Not Available' ? row[6] : null
        const subject = asin ?? `n:${(row[5] ?? '').replace(/\s+Part \d+$/i, '').toLowerCase()}`
        const key = [profile, subject, row[0], row[1], row[3], row[4], row[2], row[7], row[8], row[11], row[13]].join('|')
        if (seen.has(key)) continue
        seen.add(key)
        dedupedRows += 1
        dedupedDurationSum += Number(row[2]) || 0
      }
    }

    expect(rawRows).toBeGreaterThan(dedupedRows)
    expect(bundle.profiles).toHaveLength(listeningPaths.length)
    expect(bundle.listening).toHaveLength(dedupedRows)
    expect(bundle.listening.reduce((sum, s) => sum + s.durationMs, 0)).toBe(dedupedDurationSum)

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
        rawRows,
        keptSessions: bundle.listening.length,
        echoDuplicates: rawRows - dedupedRows,
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
