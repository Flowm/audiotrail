import type { LibraryItem, SeriesRef } from '@/types/models'
import type { RawLibraryRow } from '@/types/raw'

import { parseCsv } from '../csv'
import { epochMs, int, sentinel, splitList, yesNo } from '../normalize'

import type { DatasetDescriptor } from './descriptor'

const SERIES_RE = /^asin:([^,]*),\s*title:(.*)$/

/**
 * 'asin:A,title:X,asin:B,title:Y' — a flat repeating list; one book can sit
 * in several series at once (saga + universe). Titles may contain commas,
 * so entries split on ',asin:' boundaries only.
 */
export function parseSeriesInfo(value: string | undefined): SeriesRef[] {
  const raw = sentinel(value)
  if (raw === null) return []
  const refs: SeriesRef[] = []
  for (const chunk of raw.split(/,(?=asin:)/)) {
    const match = SERIES_RE.exec(chunk.trim())
    const title = match?.[2]?.trim()
    if (match && title) refs.push({ asin: sentinel(match[1]), title })
  }
  return refs
}

/**
 * The takeout ships up to three marketplace-variant Library files with
 * heavily overlapping ASINs. Merge rule: rows sorted by last_updated (newest
 * first), first non-null value wins per field; marketplaces are unioned,
 * is_finished is yes-if-any-yes, purchase_date is the earliest seen.
 */
export function mergeLibraryRows(rows: RawLibraryRow[]): {
  items: LibraryItem[]
  skipped: number
} {
  const byAsin = new Map<string, RawLibraryRow[]>()
  let skipped = 0
  for (const row of rows) {
    const asin = sentinel(row.ASIN)
    if (asin === null) {
      skipped += 1
      continue
    }
    const group = byAsin.get(asin)
    if (group) group.push(row)
    else byAsin.set(asin, [row])
  }

  const items: LibraryItem[] = []
  for (const [asin, group] of byAsin) {
    group.sort((a, b) => (epochMs(b.last_updated) ?? 0) - (epochMs(a.last_updated) ?? 0))

    const pick = (field: keyof RawLibraryRow): string | null => {
      for (const row of group) {
        const value = sentinel(row[field])
        if (value !== null) return value
      }
      return null
    }
    const pickList = (field: keyof RawLibraryRow): string[] => {
      for (const row of group) {
        const list = splitList(row[field])
        if (list.length > 0) return list
      }
      return []
    }

    const finishedVotes = group.map((row) => yesNo(row.is_finished)).filter((v) => v !== null)
    const purchaseDates = group
      .map((row) => epochMs(row.purchase_date))
      .filter((v): v is number => v !== null)
    const series = group
      .map((row) => parseSeriesInfo(row.book_series_info))
      .find((refs) => refs.length > 0)

    items.push({
      asin,
      title: pick('title') ?? pick('product_name') ?? `Unknown title (${asin})`,
      subtitle: pick('subtitle'),
      lengthMinutes: int(pick('length_in_minutes')),
      authors: pickList('authors'),
      narrators: pickList('audiobook_narrator'),
      purchaseDate: purchaseDates.length > 0 ? Math.min(...purchaseDates) : null,
      lastUpdated: epochMs(group[0]?.last_updated),
      isFinished: finishedVotes.length === 0 ? null : finishedVotes.some((v) => v),
      ownership: pick('ownership'),
      availableInLibrary: yesNo(pick('available_in_library')),
      language: pick('language'),
      publisher: pick('publisher'),
      series: series ?? [],
      contentDeliveryType: pick('content_delivery_type'),
      acquisitionMethod: pick('acquisition_method'),
      formatType: pick('format_type'),
      planTier: pick('plan_tier'),
      isAdultProduct: yesNo(pick('is_adult_product')),
      hasNextInSeries: yesNo(pick('has_next_title_in_series')),
      marketplaces: [...new Set(group.map((row) => sentinel(row.marketplace)).filter(Boolean))] as string[],
    })
  }

  items.sort((a, b) => a.title.localeCompare(b.title))
  return { items, skipped }
}

export const libraryDataset: DatasetDescriptor = {
  key: 'library',
  label: 'Library',
  match: /AudibleLibraryItemFactoryService\/datasets\/Library[^/]*\/[^/]*\.csv$/i,

  async parse(files) {
    const warnings: string[] = []
    const allRows: RawLibraryRow[] = []
    for (const file of files) {
      const { rows, warnings: csvWarnings } = parseCsv(await file.text())
      warnings.push(...csvWarnings.map((warning) => `${file.path}: ${warning}`))
      allRows.push(...(rows as RawLibraryRow[]))
    }

    const { items, skipped } = mergeLibraryRows(allRows)
    if (skipped > 0) warnings.push(`skipped ${skipped} row(s) without an ASIN`)

    return {
      patch: { library: items },
      rows: items.length,
      detail: `${allRows.length} rows across ${files.length} file(s) merged into ${items.length} titles`,
      warnings,
    }
  },
}
