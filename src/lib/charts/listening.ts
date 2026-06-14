import type { EChartsOption } from "echarts";

import type { SeriesEras } from "@/lib/derive/people";
import { dayToIso, epochDay, fillDays, monthlyTotals, monthSpan, weeklyTotals, type DayTotal, type HistogramBucket, type WeekdayStat } from "@/lib/derive/time";
import { formatDuration, formatMonth } from "@/lib/format";

import { baseTooltip, monoAxisLabel, truncate, withAlpha } from "./common";
import type { ChartPalette } from "./types";

export type RhythmGranularity = "day" | "week" | "month";

const HOUR_MS = 3_600_000;

/** Trailing moving average over a numeric series; the window is in points. */
function trailingAverage(values: number[], window: number): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i]!;
    if (i >= window) sum -= values[i - window]!;
    out.push(sum / Math.min(i + 1, window));
  }
  return out;
}

interface AvgLine {
  window: number;
  label: string;
}

// A short + long trailing-average pair scaled to each granularity.
const AVG_LINES: Record<RhythmGranularity, [AvgLine, AvgLine]> = {
  day: [
    { window: 7, label: "7-day avg" },
    { window: 30, label: "30-day avg" },
  ],
  week: [
    { window: 4, label: "4-week avg" },
    { window: 12, label: "12-week avg" },
  ],
  month: [
    { window: 3, label: "3-month avg" },
    { window: 12, label: "12-month avg" },
  ],
};

/**
 * Listening time per period, always in hours, with a dataZoom brush and two
 * trailing-average lines. The bar series is in the legend too, so clicking it
 * hides the bars and leaves just the average lines.
 */
export function rhythmOption(granularity: RhythmGranularity, days: DayTotal[], p: ChartPalette): EChartsOption {
  let categories: string[] = [];
  let values: number[] = [];

  if (granularity === "day") {
    const filled = fillDays(days);
    categories = filled.map((day) => day.date);
    values = filled.map((day) => day.ms / HOUR_MS);
  } else if (granularity === "week") {
    // Gap-fill silent weeks so the trailing average counts them as zero.
    const weeks = weeklyTotals(days);
    if (weeks.length > 0) {
      const byWeek = new Map(weeks.map((week) => [week.weekStart, week.ms]));
      const last = epochDay(weeks[weeks.length - 1]!.weekStart);
      for (let day = epochDay(weeks[0]!.weekStart); day <= last; day += 7) {
        const weekStart = dayToIso(day);
        categories.push(weekStart);
        values.push((byWeek.get(weekStart) ?? 0) / HOUR_MS);
      }
    }
  } else {
    const monthly = monthlyTotals(days);
    const months = monthly.length > 0 ? monthSpan(monthly[0]!.month, monthly[monthly.length - 1]!.month) : [];
    const byMonth = new Map(monthly.map((entry) => [entry.month, entry.ms]));
    categories = months;
    values = months.map((month) => (byMonth.get(month) ?? 0) / HOUR_MS);
  }

  const barName = granularity === "day" ? "per day" : granularity === "week" ? "per week" : "per month";
  const [shortAvg, longAvg] = AVG_LINES[granularity];
  const avgColors = [p.series[1]!, p.series[4]!];

  const series: Record<string, unknown>[] = [
    {
      name: barName,
      type: "bar",
      data: values,
      barCategoryGap: granularity === "day" ? "0%" : "25%",
      itemStyle: { color: granularity === "day" ? withAlpha(p.accent, 0.8) : p.accent },
      z: 1,
    },
    ...[shortAvg, longAvg].map((avg, index) => ({
      name: avg.label,
      type: "line" as const,
      data: trailingAverage(values, avg.window),
      showSymbol: false,
      smooth: 0.3,
      lineStyle: { color: avgColors[index], width: 1.6 },
      itemStyle: { color: avgColors[index] },
      z: 3 - index,
    })),
  ];

  // default view: roughly the most recent year
  const startIndex = granularity === "day" ? Math.max(0, categories.length - 366) : granularity === "week" ? Math.max(0, categories.length - 53) : 0;

  return {
    grid: { left: 8, right: 14, top: 34, bottom: 56, containLabel: true },
    legend: {
      top: 2,
      right: 0,
      icon: "roundRect",
      itemWidth: 12,
      itemHeight: 8,
      textStyle: { color: p.text, fontSize: 10 },
      data: [barName, shortAvg.label, longAvg.label],
    },
    tooltip: {
      ...baseTooltip(p),
      trigger: "axis",
      valueFormatter: (value) => (value == null ? "—" : formatDuration((Number(value) || 0) * HOUR_MS)),
    },
    xAxis: {
      type: "category",
      data: categories,
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: {
        ...monoAxisLabel(p),
        formatter: (value: string) => (granularity === "month" ? formatMonth(value) : value.slice(0, 7)),
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { ...monoAxisLabel(p), formatter: "{value} h" },
      splitLine: { lineStyle: { color: p.split } },
    },
    dataZoom: [
      { type: "inside", startValue: categories[startIndex] },
      {
        type: "slider",
        startValue: categories[startIndex],
        height: 16,
        bottom: 8,
        borderColor: p.axis,
        fillerColor: withAlpha(p.accent, 0.12),
        handleStyle: { color: p.accent },
        textStyle: { color: p.text, fontSize: 9, fontFamily: "IBM Plex Mono" },
      },
    ],
    series: series as EChartsOption["series"],
  };
}

/** Monthly hours stacked by the top series — the "eras" chart. */
export function erasOption(eras: SeriesEras, p: ChartPalette): EChartsOption | null {
  if (eras.groups.length === 0 && eras.other.every((hours) => hours === 0)) return null;

  const series: Record<string, unknown>[] = eras.groups.map((group, index) => ({
    name: truncate(group.title, 26),
    type: "bar",
    stack: "series",
    itemStyle: { color: p.series[index % p.series.length] },
    data: group.data,
  }));

  series.push({
    name: "everything else",
    type: "bar",
    stack: "series",
    itemStyle: { color: withAlpha(p.text, 0.25) },
    data: eras.other,
  });

  return {
    grid: { left: 42, right: 14, top: 12, bottom: 64 },
    legend: {
      type: "scroll",
      bottom: 0,
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: p.text, fontSize: 10 },
      pageTextStyle: { color: p.text },
      pageIconColor: p.accent,
    },
    tooltip: {
      ...baseTooltip(p),
      trigger: "axis",
      order: "valueDesc",
      valueFormatter: (value) => `${Number(value) || 0} h`,
    },
    xAxis: {
      type: "category",
      data: eras.months,
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: { ...monoAxisLabel(p), formatter: (value: string) => formatMonth(value) },
    },
    yAxis: {
      type: "value",
      axisLabel: { ...monoAxisLabel(p), formatter: "{value} h" },
      splitLine: { lineStyle: { color: p.split } },
    },
    series: series as EChartsOption["series"],
  };
}

/** Average listening per weekday in hours (calendar-honest denominator). */
export function weekdayOption(stats: WeekdayStat[], p: ChartPalette): EChartsOption {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return {
    grid: { left: 8, right: 12, top: 14, bottom: 28, containLabel: true },
    tooltip: {
      ...baseTooltip(p),
      // Read the precise ms off the stat so the tooltip isn't limited to the
      // rounded hours shown on the axis.
      formatter: (params: unknown) => {
        const { dataIndex } = params as { dataIndex: number };
        return `${labels[dataIndex]}: ${formatDuration(stats[dataIndex]!.avgMs)} on average`;
      },
    },
    xAxis: {
      type: "category",
      data: labels,
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: monoAxisLabel(p),
    },
    yAxis: {
      type: "value",
      axisLabel: { ...monoAxisLabel(p), formatter: "{value} h" },
      splitLine: { lineStyle: { color: p.split } },
    },
    series: [
      {
        type: "bar",
        data: stats.map((stat) => stat.avgMs / HOUR_MS),
        barWidth: "55%",
        itemStyle: { color: p.accent, borderRadius: [4, 4, 0, 0] },
      },
    ],
  };
}

/** Session-length distribution. */
export function sessionHistogramOption(buckets: HistogramBucket[], p: ChartPalette): EChartsOption {
  return {
    grid: { left: 50, right: 12, top: 14, bottom: 28 },
    tooltip: {
      ...baseTooltip(p),
      formatter: (params: unknown) => {
        const { name, value } = params as { name: string; value: number };
        return `${name}: ${value.toLocaleString("en")} sessions`;
      },
    },
    xAxis: {
      type: "category",
      data: buckets.map((bucket) => bucket.label),
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: { ...monoAxisLabel(p), interval: 0, rotate: 28 },
    },
    yAxis: {
      type: "value",
      axisLabel: monoAxisLabel(p),
      splitLine: { lineStyle: { color: p.split } },
    },
    series: [
      {
        type: "bar",
        data: buckets.map((bucket) => bucket.count),
        barWidth: "55%",
        itemStyle: { color: p.accent, borderRadius: [4, 4, 0, 0] },
      },
    ],
  };
}
