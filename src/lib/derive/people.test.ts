import { describe, expect, it } from 'vitest'

import { isoDate } from '@/lib/ingest/normalize'
import type { IsoDate, LibraryItem, ListeningSession } from '@/types/models'

import type { BookStats } from './books'
import { authorNarratorSankey, authorStats, monthlyAuthorHours, narratorStats, seriesStats } from './people'

const d = (s: string): IsoDate => isoDate(s)!

function libraryItem(over: Partial<LibraryItem> & { asin: string }): LibraryItem {
  return {
    title: over.asin,
    subtitle: null,
    lengthMinutes: null,
    authors: [],
    narrators: [],
    purchaseDate: null,
    lastUpdated: null,
    isFinished: null,
    ownership: 'Active',
    availableInLibrary: true,
    language: null,
    publisher: null,
    series: [],
    contentDeliveryType: null,
    acquisitionMethod: null,
    formatType: null,
    planTier: null,
    isAdultProduct: null,
    hasNextInSeries: null,
    marketplaces: [],
    ...over,
  }
}

function book(over: Partial<BookStats> & { key: string }): BookStats {
  return {
    asin: over.key,
    title: over.key,
    library: null,
    totalMs: 0,
    sessionCount: 0,
    daysListened: 0,
    firstListen: null,
    lastListen: null,
    bookLengthMs: null,
    maxEndPositionMs: null,
    completion: null,
    finished: false,
    ...over,
  }
}

const HOUR = 3_600_000

describe('authorStats / narratorStats', () => {
  it('credits every listed author and sorts by hours', () => {
    const books = [
      book({
        key: 'A',
        totalMs: 2 * HOUR,
        finished: true,
        library: libraryItem({ asin: 'A', authors: ['Ann Author', 'Co Writer'], narrators: ['Nina Narrator'] }),
      }),
      book({
        key: 'B',
        totalMs: 5 * HOUR,
        library: libraryItem({ asin: 'B', authors: ['Big Name'], narrators: ['Nina Narrator'] }),
      }),
    ]
    const authors = authorStats(books)
    expect(authors[0]!.name).toBe('Big Name')
    expect(authors.find((a) => a.name === 'Co Writer')!.totalMs).toBe(2 * HOUR)
    expect(authors.find((a) => a.name === 'Ann Author')!.finishedCount).toBe(1)

    const narrators = narratorStats(books)
    expect(narrators).toHaveLength(1)
    expect(narrators[0]!.totalMs).toBe(7 * HOUR)
    expect(narrators[0]!.bookCount).toBe(2)
  })
})

describe('seriesStats', () => {
  it('groups by series and counts owned/started/finished', () => {
    const series = [{ asin: 'S1', title: 'The Saga' }]
    const books = [
      book({ key: 'A', totalMs: HOUR, finished: true, library: libraryItem({ asin: 'A', series }) }),
      book({ key: 'B', totalMs: 0, library: libraryItem({ asin: 'B', series }) }),
      book({ key: 'C', totalMs: HOUR, library: libraryItem({ asin: 'C', series: [{ asin: null, title: 'Other' }] }) }),
    ]
    const stats = seriesStats(books)
    const saga = stats.find((s) => s.title === 'The Saga')!
    expect(saga.owned).toBe(2)
    expect(saga.started).toBe(1)
    expect(saga.finished).toBe(1)
    expect(saga.totalMs).toBe(HOUR)
  })
})

describe('monthlyAuthorHours', () => {
  it('attributes sessions to the first author and fills month gaps', () => {
    const books = [
      book({ key: 'B0AAA', library: libraryItem({ asin: 'B0AAA', authors: ['Ann Author'] }) }),
    ]
    const session = (date: string, ms: number): ListeningSession => ({
      profile: 'Main',
      startDate: d(date),
      endDate: d(date),
      durationMs: ms,
      startPositionMs: 0,
      endPositionMs: ms,
      productName: 'B0AAA',
      asin: 'B0AAA',
      bookLengthMs: null,
      deliveryType: null,
      narrationSpeed: null,
      audioType: 'FullTitle',
      listeningMode: null,
      appVersion: null,
      timezone: null,
    })
    const result = monthlyAuthorHours([session('2024-01-10', HOUR), session('2024-03-10', 2 * HOUR)], books)
    expect(result.months).toEqual(['2024-01', '2024-02', '2024-03'])
    expect(result.series).toHaveLength(1)
    expect(result.series[0]!.data).toEqual([1, 0, 2])
  })
})

describe('authorNarratorSankey', () => {
  it('splits hours across narrators, prefixes nodes, keeps spaces in names', () => {
    const books = [
      book({
        key: 'A',
        totalMs: 4 * HOUR,
        library: libraryItem({
          asin: 'A',
          authors: ['Brandon Sanderson'],
          narrators: ['Kate Reading', 'Michael Kramer'],
        }),
      }),
    ]
    const sankey = authorNarratorSankey(books)
    expect(sankey.nodes.map((n) => n.name)).toEqual([
      'a:Brandon Sanderson',
      'n:Kate Reading',
      'n:Michael Kramer',
    ])
    expect(sankey.nodes[0]!.label).toBe('Brandon Sanderson')
    expect(sankey.links).toHaveLength(2)
    expect(sankey.links[0]!.value).toBe(2)
    expect(sankey.links.reduce((sum, link) => sum + link.value, 0)).toBe(4)
  })

  it('limits to the top authors by hours', () => {
    const books = Array.from({ length: 15 }, (_, index) =>
      book({
        key: `K${index}`,
        totalMs: (index + 1) * HOUR,
        library: libraryItem({
          asin: `K${index}`,
          authors: [`Author ${index}`],
          narrators: ['Shared Narrator'],
        }),
      }),
    )
    const sankey = authorNarratorSankey(books, 5)
    expect(sankey.links).toHaveLength(5)
    expect(sankey.nodes.filter((n) => n.name.startsWith('a:'))).toHaveLength(5)
  })
})
