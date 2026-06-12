import type { EChartsOption } from 'echarts'

import { baseTooltip } from './common'

import type { ChartPalette } from './types'

export interface DonutSlice {
  name: string
  value: number
}

export function donutOption(
  slices: DonutSlice[],
  p: ChartPalette,
  format?: (value: number) => string,
): EChartsOption {
  const fmt = format ?? ((value: number): string => String(value))
  return {
    tooltip: {
      ...baseTooltip(p),
      formatter: (params: unknown) => {
        const { name, value, percent } = params as { name: string; value: number; percent: number }
        return `${name}: ${fmt(value)} (${Math.round(percent)}%)`
      },
    },
    legend: {
      bottom: 0,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 10,
      textStyle: { color: p.text, fontSize: 11 },
    },
    color: p.series,
    series: [
      {
        type: 'pie',
        radius: ['52%', '76%'],
        center: ['50%', '42%'],
        label: { show: false },
        itemStyle: { borderColor: p.cellBorder, borderWidth: 2 },
        data: slices,
      },
    ],
  }
}
