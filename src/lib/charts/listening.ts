import type { EChartsOption } from 'echarts'

import { formatDuration, formatMonth } from '@/lib/format'

import {
  fillDays,
  monthlyTotals,
  monthSpan,
  rollingAverage,
  weeklyTotals,
  type DayTotal,
  type HistogramBucket,
  type WeekdayStat,
} from '@/lib/derive/time'
import type { ListeningSession } from '@/types/models'

import { baseTooltip, monoAxisLabel, truncate, withAlpha } from './common'

import type { ChartPalette } from './types'

export type RhythmGranularity = 'day' | 'week' | 'month'

const round1 = (value: number): number => Math.round(value * 10) / 10

/** Bars of listening time with dataZoom; daily granularity adds 7/30-day rolling averages. */
export function rhythmOption(
  granularity: RhythmGranularity,
  days: DayTotal[],
  p: ChartPalette,
): EChartsOption {
  let categories: string[]
  let values: number[]
  let unit: 'min' | 'h'

  if (granularity === 'day') {
    const filled = fillDays(days)
    categories = filled.map((day) => day.date)
    values = filled.map((day) => Math.round(day.ms / 60_000))
    unit = 'min'
  } else if (granularity === 'week') {
    const weeks = weeklyTotals(days)
    categories = weeks.map((week) => week.weekStart)
    values = weeks.map((week) => round1(week.ms / 3_600_000))
    unit = 'h'
  } else {
    const monthly = monthlyTotals(days)
    const months =
      monthly.length > 0 ? monthSpan(monthly[0]!.month, monthly[monthly.length - 1]!.month) : []
    const byMonth = new Map(monthly.map((entry) => [entry.month, entry.ms]))
    categories = months
    values = months.map((month) => round1((byMonth.get(month) ?? 0) / 3_600_000))
    unit = 'h'
  }

  const series: Record<string, unknown>[] = [
    {
      name: granularity === 'day' ? 'minutes' : 'hours',
      type: 'bar',
      data: values,
      barCategoryGap: granularity === 'day' ? '0%' : '25%',
      itemStyle: { color: granularity === 'day' ? withAlpha(p.accent, 0.8) : p.accent },
    },
  ]

  if (granularity === 'day') {
    for (const [window, color] of [
      [7, p.series[1]!],
      [30, p.series[4]!],
    ] as const) {
      series.push({
        name: `${window}-day avg`,
        type: 'line',
        data: rollingAverage(days, window).map((entry) => Math.round(entry.ms / 60_000)),
        showSymbol: false,
        smooth: 0.3,
        lineStyle: { color, width: 1.6 },
        itemStyle: { color },
      })
    }
  }

  // default view: roughly the most recent year
  const startIndex =
    granularity === 'day'
      ? Math.max(0, categories.length - 366)
      : granularity === 'week'
        ? Math.max(0, categories.length - 53)
        : 0

  return {
    grid: { left: 46, right: 14, top: 30, bottom: 56 },
    legend:
      granularity === 'day'
        ? {
            top: 0,
            right: 0,
            icon: 'roundRect',
            itemWidth: 10,
            itemHeight: 3,
            textStyle: { color: p.text, fontSize: 10 },
            data: ['7-day avg', '30-day avg'],
          }
        : undefined,
    tooltip: {
      ...baseTooltip(p),
      trigger: 'axis',
      valueFormatter: (value) =>
        unit === 'min'
          ? formatDuration((Number(value) || 0) * 60_000)
          : `${Number(value) || 0} h`,
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: {
        ...monoAxisLabel(p),
        formatter: (value: string) =>
          granularity === 'month' ? formatMonth(value) : value.slice(0, 7),
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { ...monoAxisLabel(p), formatter: `{value} ${unit}` },
      splitLine: { lineStyle: { color: p.split } },
    },
    dataZoom: [
      { type: 'inside', startValue: categories[startIndex] },
      {
        type: 'slider',
        startValue: categories[startIndex],
        height: 16,
        bottom: 8,
        borderColor: p.axis,
        fillerColor: withAlpha(p.accent, 0.12),
        handleStyle: { color: p.accent },
        textStyle: { color: p.text, fontSize: 9, fontFamily: 'IBM Plex Mono' },
      },
    ],
    series: series as EChartsOption['series'],
  }
}

/** Monthly hours stacked by the top-N books — the "eras" chart. */
export function erasOption(sessions: ListeningSession[], p: ChartPalette): EChartsOption | null {
  const totals = new Map<string, number>()
  const titles = new Map<string, string>()
  const perMonth = new Map<string, Map<string, number>>()

  for (const session of sessions) {
    if (session.audioType !== 'FullTitle') continue
    const key = session.asin ?? `name:${session.productName.toLowerCase()}`
    totals.set(key, (totals.get(key) ?? 0) + session.durationMs)
    const existing = titles.get(key)
    if (existing === undefined || session.productName.length < existing.length) {
      titles.set(key, session.productName)
    }
    const month = session.startDate.slice(0, 7)
    let bucket = perMonth.get(month)
    if (!bucket) {
      bucket = new Map()
      perMonth.set(month, bucket)
    }
    bucket.set(key, (bucket.get(key) ?? 0) + session.durationMs)
  }

  if (perMonth.size === 0) return null
  const monthKeys = [...perMonth.keys()].sort()
  const months = monthSpan(monthKeys[0]!, monthKeys[monthKeys.length - 1]!)
  const topKeys = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key]) => key)
  const topSet = new Set(topKeys)

  const series = topKeys.map((key, index) => ({
    name: truncate(titles.get(key) ?? key, 26),
    type: 'bar' as const,
    stack: 'books',
    itemStyle: { color: p.series[index % p.series.length] },
    data: months.map((month) => round1((perMonth.get(month)?.get(key) ?? 0) / 3_600_000)),
  }))

  series.push({
    name: 'everything else',
    type: 'bar',
    stack: 'books',
    itemStyle: { color: withAlpha(p.text, 0.25) },
    data: months.map((month) => {
      let rest = 0
      for (const [key, ms] of perMonth.get(month) ?? []) {
        if (!topSet.has(key)) rest += ms
      }
      return round1(rest / 3_600_000)
    }),
  })

  return {
    grid: { left: 42, right: 14, top: 12, bottom: 64 },
    legend: {
      type: 'scroll',
      bottom: 0,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: p.text, fontSize: 10 },
      pageTextStyle: { color: p.text },
      pageIconColor: p.accent,
    },
    tooltip: {
      ...baseTooltip(p),
      trigger: 'axis',
      order: 'valueDesc',
      valueFormatter: (value) => `${Number(value) || 0} h`,
    },
    xAxis: {
      type: 'category',
      data: months,
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: { ...monoAxisLabel(p), formatter: (value: string) => formatMonth(value) },
    },
    yAxis: {
      type: 'value',
      axisLabel: { ...monoAxisLabel(p), formatter: '{value} h' },
      splitLine: { lineStyle: { color: p.split } },
    },
    series: series as EChartsOption['series'],
  }
}

/** Average minutes per weekday (calendar-honest denominator). */
export function weekdayOption(stats: WeekdayStat[], p: ChartPalette): EChartsOption {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return {
    grid: { left: 46, right: 12, top: 14, bottom: 28 },
    tooltip: {
      ...baseTooltip(p),
      formatter: (params: unknown) => {
        const { dataIndex, value } = params as { dataIndex: number; value: number }
        return `${labels[dataIndex]}: ${formatDuration(value * 60_000)} on average`
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: monoAxisLabel(p),
    },
    yAxis: {
      type: 'value',
      axisLabel: { ...monoAxisLabel(p), formatter: '{value} min' },
      splitLine: { lineStyle: { color: p.split } },
    },
    series: [
      {
        type: 'bar',
        data: stats.map((stat) => Math.round(stat.avgMs / 60_000)),
        barWidth: '55%',
        itemStyle: { color: p.accent, borderRadius: [4, 4, 0, 0] },
      },
    ],
  }
}

/** Session-length distribution. */
export function sessionHistogramOption(
  buckets: HistogramBucket[],
  p: ChartPalette,
): EChartsOption {
  return {
    grid: { left: 50, right: 12, top: 14, bottom: 28 },
    tooltip: {
      ...baseTooltip(p),
      formatter: (params: unknown) => {
        const { name, value } = params as { name: string; value: number }
        return `${name}: ${value.toLocaleString('en')} sessions`
      },
    },
    xAxis: {
      type: 'category',
      data: buckets.map((bucket) => bucket.label),
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: { ...monoAxisLabel(p), interval: 0, rotate: 28 },
    },
    yAxis: {
      type: 'value',
      axisLabel: monoAxisLabel(p),
      splitLine: { lineStyle: { color: p.split } },
    },
    series: [
      {
        type: 'bar',
        data: buckets.map((bucket) => bucket.count),
        barWidth: '55%',
        itemStyle: { color: p.accent, borderRadius: [4, 4, 0, 0] },
      },
    ],
  }
}
