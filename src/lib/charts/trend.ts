import type { EChartsOption } from "echarts";

import { formatDate, formatNumber } from "@/lib/format";
import type { IsoDate } from "@/types/models";

import { baseTooltip, monoAxisLabel, withAlpha } from "./common";
import type { ChartPalette } from "./types";

/** All-time cumulative listening hours area chart. */
export function cumulativeHoursOption(cumulativeDays: { date: IsoDate; cumMs: number }[], p: ChartPalette): EChartsOption {
  const data = cumulativeDays.map((day) => [Date.parse(`${day.date}T00:00:00Z`), Math.round((day.cumMs / 3_600_000) * 10) / 10]);

  return {
    grid: { left: 50, right: 16, top: 16, bottom: 30 },
    tooltip: {
      ...baseTooltip(p),
      trigger: "axis",
      formatter: (params: unknown) => {
        const [first] = params as { value: [number, number] }[];
        if (!first) return "";
        return `${formatDate(first.value[0])} — ${formatNumber(first.value[1])} h total`;
      },
    },
    xAxis: {
      type: "time",
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: monoAxisLabel(p),
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { ...monoAxisLabel(p), formatter: (value: number) => `${formatNumber(value)} h` },
      splitLine: { lineStyle: { color: p.split } },
    },
    series: [
      {
        type: "line",
        data,
        showSymbol: false,
        lineStyle: { color: p.accent, width: 2 },
        itemStyle: { color: p.accent },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: withAlpha(p.accent, 0.35) },
              { offset: 1, color: withAlpha(p.accent, 0) },
            ],
          },
        },
      },
    ],
  };
}
