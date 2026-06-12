import { describe, expect, it } from 'vitest'

import { isoDate } from '@/lib/ingest/normalize'
import type { IsoDate, LibraryItem, ListeningSession } from '@/types/models'

import { buildBookStats } from './books'

const d = (s: string): IsoDate => isoDate(s)!

function session(over: Partial<ListeningSession>): ListeningSession {
  return {
    profile: 'Main',
    startDate: d('2024-01-01'),
    endDate: d('2024-01-01'),
    durationMs: 60_000,
    startPositionMs: 0,
    endPositionMs: 60_000,
    productName: 'Some Book',
    asin: 'B000000001',
    bookLengthMs: 600_000,
    deliveryType: null,
    narrationSpeed: null,
    audioType: 'FullTitle',
    listeningMode: null,
    appVersion: null,
    timezone: null,
    ...over,
  }
}

function libraryItem(over: Partial<LibraryItem> & { asin: string; title: string }): LibraryItem {
  return {
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

describe('buildBookStats', () => {
  it('joins by ASIN and accumulates sessions', () => {
    const lib = [libraryItem({ asin: 'B000000001', title: 'Some Book' })]
    const { books } = buildBookStats(
      [
        session({ endPositionMs: 300_000 }),
        session({ startDate: d('2024-01-03'), durationMs: 120_000, endPositionMs: 540_000 }),
      ],
      lib,
    )
    expect(books).toHaveLength(1)
    const book = books[0]!
    expect(book.library).toBe(lib[0])
    expect(book.totalMs).toBe(180_000)
    expect(book.sessionCount).toBe(2)
    expect(book.daysListened).toBe(2)
    expect(book.firstListen).toBe('2024-01-01')
    expect(book.lastListen).toBe('2024-01-03')
    expect(book.completion).toBeCloseTo(0.9)
    expect(book.finished).toBe(false)
  })

  it('falls back to product-name matching when ASINs differ', () => {
    const lib = [libraryItem({ asin: 'B0LIBRARY1', title: 'The Same Title' })]
    const { books, unmatchedListened } = buildBookStats(
      [session({ asin: 'B0PARTASIN', productName: 'The  same title ' })],
      lib,
    )
    expect(books).toHaveLength(1)
    expect(books[0]!.library?.asin).toBe('B0LIBRARY1')
    expect(unmatchedListened).toBe(0)
  })

  it('excludes previews from books but counts them as samples', () => {
    const { books, samplesBrowsed } = buildBookStats(
      [
        session({ audioType: 'CatalogSample', asin: 'B0SAMPLE01', productName: 'Sample A' }),
        session({ audioType: 'Preview', asin: 'B0SAMPLE02', productName: 'Sample B' }),
        session({}),
      ],
      [],
    )
    expect(books).toHaveLength(1)
    expect(samplesBrowsed).toBe(2)
  })

  it('clamps completion to 1 when the end position overshoots the length', () => {
    const { books } = buildBookStats([session({ endPositionMs: 700_000 })], [])
    expect(books[0]!.completion).toBe(1)
    expect(books[0]!.finished).toBe(true)
  })

  it('uses library length when sessions lack one, and Audible finished flag wins', () => {
    const lib = [
      libraryItem({ asin: 'B000000001', title: 'Some Book', lengthMinutes: 100, isFinished: true }),
    ]
    const { books } = buildBookStats(
      [session({ bookLengthMs: null, endPositionMs: 3_000_000 })],
      lib,
    )
    const book = books[0]!
    expect(book.bookLengthMs).toBe(6_000_000)
    expect(book.completion).toBeCloseTo(0.5)
    expect(book.finished).toBe(true)
  })

  it('appends never-listened library items with zero time', () => {
    const lib = [libraryItem({ asin: 'B0UNTOUCHED', title: 'Backlog Book', lengthMinutes: 60 })]
    const { books } = buildBookStats([session({})], lib)
    expect(books).toHaveLength(2)
    const backlog = books.find((b) => b.asin === 'B0UNTOUCHED')!
    expect(backlog.totalMs).toBe(0)
    expect(backlog.completion).toBeNull()
    expect(backlog.finished).toBe(false)
  })

  it('counts listened books without any library match', () => {
    const { unmatchedListened } = buildBookStats(
      [session({ asin: 'B0NOWHERE1', productName: 'Ghost Book' })],
      [libraryItem({ asin: 'B0OTHER', title: 'Different' })],
    )
    expect(unmatchedListened).toBe(1)
  })
})
