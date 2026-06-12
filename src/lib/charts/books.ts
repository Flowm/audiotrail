import type { EChartsOption } from 'echarts'

import { formatDuration, formatPercent } from '@/lib/format'

import type { BookStats } from '@/lib/derive/books'

import { baseTooltip, MONO, truncate } from './common'

import type { ChartPalette } from './types'

/** Horizontal top-N books by listening time, completion in the bar label. */
export function topBooksOption(books: BookStats[], n: number, p: ChartPalette): EChartsOption {
  const top = books.slice(0, n).reverse()
  const hours = top.map((book) => Math.round((book.totalMs / 3_600_000) * 10) / 10)

  return {
    grid: { left: 8, right: 96, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      ...baseTooltip(p),
      formatter: (params: unknown) => {
        const { dataIndex } = params as { dataIndex: number }
        const book = top[dataIndex]!
        const completion =
          book.completion !== null ? ` · ${formatPercent(book.completion)} done` : ''
        return `${truncate(book.title, 60)}<br/>${formatDuration(book.totalMs)}${completion}`
      },
    },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      data: top.map((book) => truncate(book.title, 34)),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: p.textStrong, fontSize: 12 },
    },
    series: [
      {
        type: 'bar',
        data: hours,
        barWidth: 16,
        itemStyle: { color: p.accent, borderRadius: [0, 4, 4, 0] },
        label: {
          show: true,
          position: 'right',
          color: p.text,
          fontFamily: MONO,
          fontSize: 10,
          formatter: (params: unknown) => {
            const { dataIndex } = params as { dataIndex: number }
            const book = top[dataIndex]!
            const completion =
              book.completion !== null ? ` · ${formatPercent(book.completion)}` : ''
            return `${hours[dataIndex]} h${completion}`
          },
        },
      },
    ],
  }
}
