import { describe, expect, it } from 'vitest'

import { isoDate } from '@/lib/ingest/normalize'
import type { IsoDate, LibraryItem, ListeningSession } from '@/types/models'

import type { BookStats } from './books'
import { wrappedStats } from './wrapped'

const d = (s: string): IsoDate => isoDate(s)!
const HOUR = 3_600_000

function session(date: string, ms: number, asin: string, name = asin): ListeningSession {
  return {
    profile: 'Main',
    startDate: d(date),
    endDate: d(date),
    durationMs: ms,
    startPositionMs: 0,
    endPositionMs: ms,
    productName: name,
    asin,
    bookLengthMs: null,
    deliveryType: null,
    narrationSpeed: null,
    audioType: 'FullTitle',
    listeningMode: null,
    appVersion: null,
    timezone: null,
  }
}

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

describe('wrappedStats', () => {
  const sessions = [
    session('2024-01-10', 2 * HOUR, 'B0BOOK0001', 'The Big One'),
    session('2024-01-11', 3 * HOUR, 'B0BOOK0001', 'The Big One'),
    session('2024-02-01', 1 * HOUR, 'B0BOOK0002', 'The Small One'),
    session('2023-12-31', 10 * HOUR, 'B0BOOK0001', 'The Big One'), // other year
  ]
  const books = [
    book({
      key: 'B0BOOK0001',
      totalMs: 15 * HOUR,
      firstListen: d('2023-12-31'),
      lastListen: d('2024-01-11'),
      finished: true,
      library: libraryItem({ asin: 'B0BOOK0001', authors: ['Big Author'], narrators: ['Big Voice'] }),
    }),
    book({
      key: 'B0BOOK0002',
      totalMs: HOUR,
      firstListen: d('2024-02-01'),
      lastListen: d('2024-02-01'),
      completion: 0.9,
      library: libraryItem({ asin: 'B0BOOK0002', authors: ['Small Author'], narrators: [] }),
    }),
  ]

  it('scopes everything to the requested year', () => {
    const stats = wrappedStats(2024, sessions, books, [], [])
    expect(stats.totalMs).toBe(6 * HOUR)
    expect(stats.sessions).toBe(3)
    expect(stats.daysActive).toBe(3)
    expect(stats.topBook).toEqual({ name: 'The Big One', ms: 5 * HOUR, asin: 'B0BOOK0001' })
    expect(stats.topAuthor).toEqual({ name: 'Big Author', ms: 5 * HOUR })
    expect(stats.topNarrator).toEqual({ name: 'Big Voice', ms: 5 * HOUR })
    expect(stats.biggestDay?.date).toBe('2024-01-11')
    expect(stats.longestStreak.days).toBe(2)
    expect(stats.busiestMonth).toEqual({ month: '2024-01', ms: 5 * HOUR })
    expect(stats.booksStarted).toBe(1)
    expect(stats.booksFinished).toBe(1)
  })

  it('lists almost-finished books left hanging that year', () => {
    const stats = wrappedStats(2024, sessions, books, [], [])
    expect(stats.almostFinished).toEqual([{ title: 'B0BOOK0002', completion: 0.9 }])
  })

  it('reports spend null without money data, value with it', () => {
    const noMoney = wrappedStats(2024, sessions, books, [], [])
    expect(noMoney.spend).toBeNull()
    expect(noMoney.costPerHour).toBeNull()

    const withMoney = wrappedStats(
      2024,
      sessions,
      books,
      [
        {
          billingDate: d('2024-03-01'),
          periodStart: null,
          periodEnd: null,
          baseAmount: null,
          tax: null,
          totalAmount: 60,
          currency: 'EUR',
          type: 'Charge',
          plan: null,
          billingFreqMonths: null,
          planFee: null,
          offerName: null,
          offerType: null,
          taxReason: null,
          status: null,
        },
      ],
      [],
    )
    expect(withMoney.spend).toBe(60)
    expect(withMoney.costPerHour).toBe(10)
  })
})
