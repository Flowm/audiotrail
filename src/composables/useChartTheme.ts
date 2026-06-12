import { computed, type ComputedRef } from 'vue'

import { useSettingsStore } from '@/stores/settings'

import type { ChartPalette } from '@/lib/charts/types'

/**
 * Bridges the Tailwind theme into ECharts: resolves the --chart-* CSS vars
 * from the document element, re-reading whenever dark mode flips (the .dark
 * class is applied synchronously by the settings store watcher).
 */
export function useChartTheme(): ComputedRef<ChartPalette> {
  const settings = useSettingsStore()
  return computed<ChartPalette>(() => {
    void settings.darkMode // dependency: re-resolve on theme flip
    const style = getComputedStyle(document.documentElement)
    const v = (name: string): string => style.getPropertyValue(name).trim()
    return {
      text: v('--chart-text'),
      textStrong: v('--chart-text-strong'),
      axis: v('--chart-axis'),
      split: v('--chart-split'),
      tooltipBg: v('--chart-tooltip-bg'),
      tooltipText: v('--chart-tooltip-text'),
      accent: v('--chart-c1'),
      series: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => v(`--chart-c${i}`)),
      heat: [1, 2, 3, 4].map((i) => v(`--chart-heat-${i}`)),
      emptyCell: v('--chart-empty-cell'),
      cellBorder: v('--chart-cell-border'),
    }
  })
}
