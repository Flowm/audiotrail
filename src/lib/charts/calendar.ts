import type { EChartsOption } from "echarts";

import type { DayTotal } from "@/lib/derive/time";
import { formatDate, formatDuration } from "@/lib/format";

import { baseTooltip, MONO } from "./common";
import type { ChartPalette } from "./types";

/** GitHub-style year heatmap of daily listening minutes. */
export function calendarHeatmapOption(days: DayTotal[], year: number, p: ChartPalette): EChartsOption {
  const inYear = days.filter((day) => day.date.startsWith(`${year}-`));
  const data = inYear.map((day) => [day.date, Math.round(day.ms / 60_000)]);

  // Cap the scale at ~p95 so a single marathon day doesn't wash out the rest.
  const sorted = inYear.map((day) => day.ms / 60_000).toSorted((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  const cap = Math.max(30, Math.ceil(p95 / 30) * 30);

  return {
    tooltip: {
      ...baseTooltip(p),
      formatter: (params: unknown) => {
        const { value } = params as { value: [string, number] };
        return `${formatDate(value[0])} — ${value[1] > 0 ? formatDuration(value[1] * 60_000) : "nothing"}`;
      },
    },
    visualMap: {
      type: "continuous",
      min: 0,
      max: cap,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      itemHeight: 110,
      itemWidth: 10,
      text: ["more", "less"],
      textStyle: { color: p.text, fontFamily: MONO, fontSize: 10 },
      inRange: { color: p.heat },
      outOfRange: { color: p.heat[p.heat.length - 1] },
    },
    calendar: {
      top: 28,
      left: 34,
      right: 8,
      bottom: 48,
      range: String(year),
      cellSize: ["auto", 13],
      itemStyle: { color: p.emptyCell, borderColor: p.cellBorder, borderWidth: 2 },
      splitLine: { show: false },
      dayLabel: {
        firstDay: 1,
        nameMap: ["S", "M", "T", "W", "T", "F", "S"],
        color: p.text,
        fontFamily: MONO,
        fontSize: 9,
      },
      monthLabel: { nameMap: "en", color: p.text, fontFamily: MONO, fontSize: 10 },
      yearLabel: { show: false },
    },
    series: [
      {
        type: "heatmap",
        coordinateSystem: "calendar",
        data,
        emphasis: { itemStyle: { borderColor: p.textStrong, borderWidth: 1 } },
      },
    ],
  };
}
