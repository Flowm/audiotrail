import type { EChartsOption } from 'echarts'

import { formatEur, formatMonth } from '@/lib/format'

import type { MonthlySpend, YearCost } from '@/lib/derive/money'

import { baseTooltip, monoAxisLabel, withAlpha } from './common'

import type { ChartPalette } from './types'

/** Monthly membership + cash bars with a cumulative line on a second axis. */
export function monthlySpendOption(rows: MonthlySpend[], p: ChartPalette): EChartsOption | null {
  if (rows.length === 0) return null
  let runningTotal = 0
  const cumulative = rows.map((row) => {
    runningTotal += row.membership + row.cash
    return Math.round(runningTotal * 100) / 100
  })

  return {
    grid: { left: 52, right: 64, top: 30, bottom: 46 },
    legend: {
      top: 0,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: p.text, fontSize: 10 },
    },
    tooltip: {
      ...baseTooltip(p),
      trigger: 'axis',
      valueFormatter: (value) => formatEur(Number(value) || 0),
    },
    xAxis: {
      type: 'category',
      data: rows.map((row) => row.month),
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: { ...monoAxisLabel(p), formatter: (value: string) => formatMonth(value) },
    },
    yAxis: [
      {
        type: 'value',
        axisLabel: { ...monoAxisLabel(p), formatter: '€{value}' },
        splitLine: { lineStyle: { color: p.split } },
      },
      {
        type: 'value',
        axisLabel: { ...monoAxisLabel(p), formatter: '€{value}' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'membership',
        type: 'bar',
        stack: 'spend',
        itemStyle: { color: p.accent },
        data: rows.map((row) => row.membership),
      },
      {
        name: 'shop (cash)',
        type: 'bar',
        stack: 'spend',
        itemStyle: { color: p.series[1] },
        data: rows.map((row) => row.cash),
      },
      {
        name: 'cumulative',
        type: 'line',
        yAxisIndex: 1,
        data: cumulative,
        showSymbol: false,
        lineStyle: { color: p.series[4], width: 1.8 },
        itemStyle: { color: p.series[4] },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: withAlpha(p.series[4]!, 0.12) },
              { offset: 1, color: withAlpha(p.series[4]!, 0) },
            ],
          },
        },
      },
    ],
  }
}

/** Effective €/hour per year, €/finished book in the tooltip. */
export function costPerHourOption(years: YearCost[], p: ChartPalette): EChartsOption | null {
  const rows = years.filter((year) => year.costPerHour !== null)
  if (rows.length === 0) return null
  return {
    grid: { left: 50, right: 14, top: 16, bottom: 28 },
    tooltip: {
      ...baseTooltip(p),
      formatter: (params: unknown) => {
        const { dataIndex } = params as { dataIndex: number }
        const year = rows[dataIndex]!
        const perBook =
          year.costPerFinished !== null
            ? `<br/>${formatEur(year.costPerFinished)} per finished book (${year.finished})`
            : ''
        return `${year.year}: ${formatEur(year.costPerHour!)} per hour<br/>${formatEur(year.spend)} for ${year.hours} h${perBook}`
      },
    },
    xAxis: {
      type: 'category',
      data: rows.map((year) => String(year.year)),
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: monoAxisLabel(p),
    },
    yAxis: {
      type: 'value',
      axisLabel: { ...monoAxisLabel(p), formatter: '€{value}' },
      splitLine: { lineStyle: { color: p.split } },
    },
    series: [
      {
        type: 'bar',
        data: rows.map((year) => year.costPerHour),
        barWidth: '50%',
        itemStyle: { color: p.accent, borderRadius: [4, 4, 0, 0] },
        label: {
          show: true,
          position: 'top',
          color: p.text,
          fontFamily: 'IBM Plex Mono',
          fontSize: 10,
          formatter: (params: unknown) => formatEur((params as { value: number }).value),
        },
      },
    ],
  }
}
