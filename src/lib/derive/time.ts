import type { IsoDate, ListeningSession } from '@/types/models'

const DAY_MS = 86_400_000

/** Days since the Unix epoch — safe integer arithmetic on IsoDates. */
export function epochDay(date: IsoDate): number {
  return Date.parse(`${date}T00:00:00Z`) / DAY_MS
}

export function dayToIso(day: number): IsoDate {
  return new Date(day * DAY_MS).toISOString().slice(0, 10) as IsoDate
}

/** Mon=0 … Sun=6 (epoch day 0 was a Thursday). */
export function weekdayOf(date: IsoDate): number {
  return (epochDay(date) + 3) % 7
}

export interface DayTotal {
  date: IsoDate
  ms: number
  sessions: number
}

/** Listened time per calendar day, ascending; days without listening omitted. */
export function dailyTotals(sessions: ListeningSession[]): DayTotal[] {
  const byDay = new Map<IsoDate, DayTotal>()
  for (const session of sessions) {
    const entry = byDay.get(session.startDate)
    if (entry) {
      entry.ms += session.durationMs
      entry.sessions += 1
    } else {
      byDay.set(session.startDate, { date: session.startDate, ms: session.durationMs, sessions: 1 })
    }
  }
  return [...byDay.values()].sort((a, b) => (a.date < b.date ? -1 : 1))
}

/** Continuous day series from first to last date (zero-filled gaps). */
export function fillDays(days: DayTotal[]): DayTotal[] {
  if (days.length === 0) return []
  const first = epochDay(days[0]!.date)
  const last = epochDay(days[days.length - 1]!.date)
  const byDate = new Map(days.map((d) => [d.date, d]))
  const filled: DayTotal[] = []
  for (let day = first; day <= last; day += 1) {
    const date = dayToIso(day)
    filled.push(byDate.get(date) ?? { date, ms: 0, sessions: 0 })
  }
  return filled
}

/** ISO-week totals keyed by the Monday of each week. */
export function weeklyTotals(days: DayTotal[]): { weekStart: IsoDate; ms: number }[] {
  const byWeek = new Map<IsoDate, number>()
  for (const day of days) {
    const epoch = epochDay(day.date)
    const monday = dayToIso(epoch - ((epoch + 3) % 7))
    byWeek.set(monday, (byWeek.get(monday) ?? 0) + day.ms)
  }
  return [...byWeek.entries()]
    .map(([weekStart, ms]) => ({ weekStart, ms }))
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1))
}

/** Every 'YYYY-MM' from first to last, inclusive — for gapless month axes. */
export function monthSpan(first: string, last: string): string[] {
  const months: string[] = []
  let [year, month] = first.split('-').map(Number) as [number, number]
  const [lastYear, lastMonth] = last.split('-').map(Number) as [number, number]
  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return months
}

export function monthlyTotals(days: DayTotal[]): { month: string; ms: number }[] {
  const byMonth = new Map<string, number>()
  for (const day of days) {
    const month = day.date.slice(0, 7)
    byMonth.set(month, (byMonth.get(month) ?? 0) + day.ms)
  }
  return [...byMonth.entries()]
    .map(([month, ms]) => ({ month, ms }))
    .sort((a, b) => (a.month < b.month ? -1 : 1))
}

export function yearlyTotals(days: DayTotal[]): { year: number; ms: number }[] {
  const byYear = new Map<number, number>()
  for (const day of days) {
    const year = Number(day.date.slice(0, 4))
    byYear.set(year, (byYear.get(year) ?? 0) + day.ms)
  }
  return [...byYear.entries()]
    .map(([year, ms]) => ({ year, ms }))
    .sort((a, b) => a.year - b.year)
}

export interface StreakInfo {
  days: number
  start: IsoDate | null
  end: IsoDate | null
}

/** Longest run of consecutive listening days. */
export function longestStreak(days: DayTotal[]): StreakInfo {
  if (days.length === 0) return { days: 0, start: null, end: null }
  let best: StreakInfo = { days: 1, start: days[0]!.date, end: days[0]!.date }
  let runStart = days[0]!.date
  let runLength = 1
  for (let i = 1; i < days.length; i += 1) {
    const previous = days[i - 1]!.date
    const current = days[i]!.date
    if (epochDay(current) - epochDay(previous) === 1) {
      runLength += 1
    } else {
      runStart = current
      runLength = 1
    }
    if (runLength > best.days) {
      best = { days: runLength, start: runStart, end: current }
    }
  }
  return best
}

/** Trailing average over `windowDays` calendar days (gaps count as zero). */
export function rollingAverage(
  days: DayTotal[],
  windowDays: number,
): { date: IsoDate; ms: number }[] {
  const filled = fillDays(days)
  const out: { date: IsoDate; ms: number }[] = []
  let windowSum = 0
  for (let i = 0; i < filled.length; i += 1) {
    windowSum += filled[i]!.ms
    if (i >= windowDays) windowSum -= filled[i - windowDays]!.ms
    const span = Math.min(i + 1, windowDays)
    out.push({ date: filled[i]!.date, ms: windowSum / span })
  }
  return out
}

export function cumulative(days: DayTotal[]): { date: IsoDate; cumMs: number }[] {
  let sum = 0
  return days.map((day) => {
    sum += day.ms
    return { date: day.date, cumMs: sum }
  })
}

export interface WeekdayStat {
  /** Mon=0 … Sun=6 */
  weekday: number
  totalMs: number
  /** Total ÷ number of that weekday in the covered calendar range. */
  avgMs: number
}

export function weekdayAverages(days: DayTotal[]): WeekdayStat[] {
  const totals = Array.from({ length: 7 }, () => 0)
  const counts = Array.from({ length: 7 }, () => 0)
  if (days.length > 0) {
    const first = epochDay(days[0]!.date)
    const last = epochDay(days[days.length - 1]!.date)
    for (let day = first; day <= last; day += 1) {
      counts[(day + 3) % 7] += 1
    }
    for (const day of days) {
      totals[weekdayOf(day.date)] += day.ms
    }
  }
  return totals.map((totalMs, weekday) => ({
    weekday,
    totalMs,
    avgMs: counts[weekday]! > 0 ? totalMs / counts[weekday]! : 0,
  }))
}

export interface HistogramBucket {
  label: string
  count: number
}

const SESSION_BUCKETS: { label: string; maxMs: number }[] = [
  { label: '< 1 min', maxMs: 60_000 },
  { label: '1–5 min', maxMs: 5 * 60_000 },
  { label: '5–15 min', maxMs: 15 * 60_000 },
  { label: '15–30 min', maxMs: 30 * 60_000 },
  { label: '30–60 min', maxMs: 60 * 60_000 },
  { label: '1–2 h', maxMs: 120 * 60_000 },
  { label: '2 h +', maxMs: Number.POSITIVE_INFINITY },
]

export function sessionLengthHistogram(sessions: ListeningSession[]): HistogramBucket[] {
  const counts = SESSION_BUCKETS.map((bucket) => ({ label: bucket.label, count: 0 }))
  for (const session of sessions) {
    const index = SESSION_BUCKETS.findIndex((bucket) => session.durationMs < bucket.maxMs)
    counts[index === -1 ? counts.length - 1 : index]!.count += 1
  }
  return counts
}

export interface BigDay {
  date: IsoDate
  ms: number
  topProducts: string[]
}

/** The n biggest listening days with what was playing. */
export function biggestDays(sessions: ListeningSession[], n: number): BigDay[] {
  const byDay = new Map<IsoDate, { ms: number; products: Map<string, number> }>()
  for (const session of sessions) {
    let entry = byDay.get(session.startDate)
    if (!entry) {
      entry = { ms: 0, products: new Map() }
      byDay.set(session.startDate, entry)
    }
    entry.ms += session.durationMs
    entry.products.set(
      session.productName,
      (entry.products.get(session.productName) ?? 0) + session.durationMs,
    )
  }
  return [...byDay.entries()]
    .sort((a, b) => b[1].ms - a[1].ms)
    .slice(0, n)
    .map(([date, { ms, products }]) => ({
      date,
      ms,
      topProducts: [...products.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([name]) => name),
    }))
}
