import { describe, expect, it } from 'vitest'

import { isoDate } from '@/lib/ingest/normalize'
import type { IsoDate, ListeningSession } from '@/types/models'

import {
  biggestDays,
  cumulative,
  dailyTotals,
  fillDays,
  longestStreak,
  monthlyTotals,
  monthSpan,
  rollingAverage,
  sessionLengthHistogram,
  weekdayAverages,
  weekdayOf,
  weeklyTotals,
  yearlyTotals,
  type DayTotal,
} from './time'

const d = (s: string): IsoDate => isoDate(s)!

function session(startDate: string, durationMs: number, productName = 'Book'): ListeningSession {
  return {
    profile: 'Main',
    startDate: d(startDate),
    endDate: d(startDate),
    durationMs,
    startPositionMs: 0,
    endPositionMs: durationMs,
    productName,
    asin: null,
    bookLengthMs: null,
    deliveryType: null,
    narrationSpeed: null,
    audioType: 'FullTitle',
    listeningMode: null,
    appVersion: null,
    timezone: null,
  }
}

const day = (date: string, ms: number): DayTotal => ({ date: d(date), ms, sessions: 1 })

describe('dailyTotals', () => {
  it('aggregates multiple sessions per day and sorts ascending', () => {
    const days = dailyTotals([
      session('2024-01-02', 100),
      session('2024-01-01', 50),
      session('2024-01-02', 200),
    ])
    expect(days).toEqual([
      { date: '2024-01-01', ms: 50, sessions: 1 },
      { date: '2024-01-02', ms: 300, sessions: 2 },
    ])
  })

  it('returns empty for no sessions', () => {
    expect(dailyTotals([])).toEqual([])
  })
})

describe('fillDays', () => {
  it('zero-fills gaps between first and last day', () => {
    const filled = fillDays([day('2024-01-01', 10), day('2024-01-04', 40)])
    expect(filled.map((f) => f.date)).toEqual(['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04'])
    expect(filled[1]!.ms).toBe(0)
  })
})

describe('monthly / yearly totals', () => {
  it('groups by calendar month and year', () => {
    const days = [day('2023-12-31', 10), day('2024-01-01', 20), day('2024-01-15', 30)]
    expect(monthlyTotals(days)).toEqual([
      { month: '2023-12', ms: 10 },
      { month: '2024-01', ms: 50 },
    ])
    expect(yearlyTotals(days)).toEqual([
      { year: 2023, ms: 10 },
      { year: 2024, ms: 50 },
    ])
  })
})

describe('longestStreak', () => {
  it('handles empty and single-day inputs', () => {
    expect(longestStreak([])).toEqual({ days: 0, start: null, end: null })
    expect(longestStreak([day('2024-01-01', 1)])).toEqual({
      days: 1,
      start: '2024-01-01',
      end: '2024-01-01',
    })
  })

  it('finds the longest run across gaps and month boundaries', () => {
    const days = [
      day('2024-01-30', 1),
      day('2024-01-31', 1),
      day('2024-02-01', 1),
      day('2024-02-03', 1),
      day('2024-02-04', 1),
    ]
    expect(longestStreak(days)).toEqual({ days: 3, start: '2024-01-30', end: '2024-02-01' })
  })

  it('keeps the first streak on ties', () => {
    const days = [day('2024-01-01', 1), day('2024-01-02', 1), day('2024-01-04', 1), day('2024-01-05', 1)]
    expect(longestStreak(days)).toEqual({ days: 2, start: '2024-01-01', end: '2024-01-02' })
  })
})

describe('rollingAverage', () => {
  it('averages over the trailing window, counting gap days as zero', () => {
    const days = [day('2024-01-01', 300), day('2024-01-03', 300)]
    const rolling = rollingAverage(days, 3)
    // windows: [300] → 300, [300,0] → 150, [300,0,300] → 200
    expect(rolling.map((r) => Math.round(r.ms))).toEqual([300, 150, 200])
  })
})

describe('cumulative', () => {
  it('is monotonically increasing', () => {
    const cum = cumulative([day('2024-01-01', 10), day('2024-01-05', 20)])
    expect(cum).toEqual([
      { date: '2024-01-01', cumMs: 10 },
      { date: '2024-01-05', cumMs: 30 },
    ])
  })
})

describe('weekdayOf / weekdayAverages', () => {
  it('maps Monday to 0 and Sunday to 6', () => {
    expect(weekdayOf(d('2024-01-01'))).toBe(0) // a Monday
    expect(weekdayOf(d('2024-01-07'))).toBe(6) // a Sunday
  })

  it('uses the calendar count of each weekday as denominator', () => {
    // Mon 2024-01-01 .. Sun 2024-01-14: every weekday occurs exactly twice
    const days = [day('2024-01-01', 600), day('2024-01-08', 600), day('2024-01-14', 700)]
    const stats = weekdayAverages(days)
    expect(stats[0]).toEqual({ weekday: 0, totalMs: 1200, avgMs: 600 })
    expect(stats[6]).toEqual({ weekday: 6, totalMs: 700, avgMs: 350 })
    expect(stats[2]!.totalMs).toBe(0)
  })
})

describe('weeklyTotals', () => {
  it('groups by ISO week (Monday key), across year boundaries', () => {
    // 2023-12-31 was a Sunday (week of Mon 2023-12-25); 2024-01-01 a Monday
    const weeks = weeklyTotals([day('2023-12-31', 10), day('2024-01-01', 20), day('2024-01-07', 30)])
    expect(weeks).toEqual([
      { weekStart: '2023-12-25', ms: 10 },
      { weekStart: '2024-01-01', ms: 50 },
    ])
  })
})

describe('monthSpan', () => {
  it('spans months inclusively across year boundaries', () => {
    expect(monthSpan('2023-11', '2024-02')).toEqual(['2023-11', '2023-12', '2024-01', '2024-02'])
    expect(monthSpan('2024-05', '2024-05')).toEqual(['2024-05'])
  })
})

describe('sessionLengthHistogram', () => {
  it('buckets session durations', () => {
    const buckets = sessionLengthHistogram([
      session('2024-01-01', 5),
      session('2024-01-01', 3 * 60_000),
      session('2024-01-01', 45 * 60_000),
      session('2024-01-01', 3 * 3_600_000),
    ])
    expect(buckets.find((b) => b.label === '< 1 min')!.count).toBe(1)
    expect(buckets.find((b) => b.label === '1–5 min')!.count).toBe(1)
    expect(buckets.find((b) => b.label === '30–60 min')!.count).toBe(1)
    expect(buckets.find((b) => b.label === '2 h +')!.count).toBe(1)
  })
})

describe('biggestDays', () => {
  it('ranks days by total time and reports the top products', () => {
    const sessions = [
      session('2024-01-01', 100, 'A'),
      session('2024-01-02', 500, 'B'),
      session('2024-01-02', 300, 'C'),
      session('2024-01-02', 50, 'D'),
    ]
    const top = biggestDays(sessions, 1)
    expect(top).toHaveLength(1)
    expect(top[0]!.date).toBe('2024-01-02')
    expect(top[0]!.ms).toBe(850)
    expect(top[0]!.topProducts).toEqual(['B', 'C'])
  })
})
