import type { EChartsOption } from "echarts";

import type { MonthlyAuthorHours } from "@/lib/derive/people";
import { formatMonth } from "@/lib/format";

import { baseTooltip, monoAxisLabel, truncate, withAlpha } from "./common";
import type { ChartPalette } from "./types";

/** Stacked monthly-hours area for the top authors — author eras. */
export function authorErasOption(data: MonthlyAuthorHours, p: ChartPalette): EChartsOption | null {
  if (data.series.length === 0) return null;
  return {
    grid: { left: 42, right: 14, top: 12, bottom: 54 },
    legend: {
      bottom: 0,
      type: "scroll",
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: p.text, fontSize: 10 },
      pageIconColor: p.accent,
      pageTextStyle: { color: p.text },
    },
    tooltip: {
      ...baseTooltip(p),
      trigger: "axis",
      order: "valueDesc",
      valueFormatter: (value) => `${Number(value) || 0} h`,
    },
    xAxis: {
      type: "category",
      data: data.months,
      boundaryGap: false,
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: { ...monoAxisLabel(p), formatter: (value: string) => formatMonth(value) },
    },
    yAxis: {
      type: "value",
      axisLabel: { ...monoAxisLabel(p), formatter: "{value} h" },
      splitLine: { lineStyle: { color: p.split } },
    },
    series: data.series.map((entry, index) => ({
      name: truncate(entry.name, 24),
      type: "line",
      stack: "authors",
      smooth: 0.25,
      showSymbol: false,
      lineStyle: { width: 1, color: p.series[index % p.series.length] },
      itemStyle: { color: p.series[index % p.series.length] },
      areaStyle: { color: withAlpha(p.series[index % p.series.length]!, 0.45) },
      data: entry.data,
    })),
  };
}
