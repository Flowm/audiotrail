import type { EChartsOption } from "echarts";

import type { BookStats } from "@/lib/derive/books";
import type { AcquisitionMonth, LagBucket } from "@/lib/derive/library";
import { formatMonth } from "@/lib/format";

import { baseTooltip, monoAxisLabel, truncate, withAlpha } from "./common";
import type { ChartPalette } from "./types";

const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Book length vs completion — exposes the abandoned-epics quadrant. */
export function completionScatterOption(books: BookStats[], p: ChartPalette): EChartsOption | null {
  const points = books
    .filter((book) => book.completion !== null && (book.bookLengthMs ?? 0) > 0)
    .map((book) => ({
      name: book.title,
      value: [round1(book.bookLengthMs! / 3_600_000), Math.round(book.completion! * 100)],
      symbolSize: Math.min(20, 5 + Math.sqrt(book.totalMs / 3_600_000) * 2.6),
    }));
  if (points.length === 0) return null;

  return {
    grid: { left: 46, right: 16, top: 16, bottom: 42 },
    tooltip: {
      ...baseTooltip(p),
      formatter: (params: unknown) => {
        const { name, value } = params as { name: string; value: [number, number] };
        return `${truncate(name, 52)}<br/>${value[0]} h long · ${value[1]}% heard`;
      },
    },
    xAxis: {
      type: "value",
      name: "book length (h)",
      nameLocation: "middle",
      nameGap: 28,
      nameTextStyle: { color: p.text, fontFamily: "IBM Plex Mono", fontSize: 10 },
      axisLine: { lineStyle: { color: p.axis } },
      axisLabel: monoAxisLabel(p),
      splitLine: { lineStyle: { color: p.split } },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: { ...monoAxisLabel(p), formatter: "{value}%" },
      splitLine: { lineStyle: { color: p.split } },
    },
    series: [
      {
        type: "scatter",
        data: points,
        itemStyle: { color: withAlpha(p.accent, 0.7) },
        emphasis: { itemStyle: { color: p.accent } },
      },
    ],
  };
}

/** Books acquired per month, stacked by payment kind. */
export function acquisitionsOption(rows: AcquisitionMonth[], p: ChartPalette): EChartsOption | null {
  if (rows.length === 0) return null;
  const stacks: { name: string; field: keyof AcquisitionMonth; color: string }[] = [
    { name: "with a credit", field: "credit", color: p.accent },
    { name: "with cash", field: "cash", color: p.series[1]! },
    { name: "other / unmatched", field: "other", color: withAlpha(p.text, 0.3) },
  ];
  return {
    grid: { left: 36, right: 14, top: 12, bottom: 52 },
    legend: {
      bottom: 0,
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: p.text, fontSize: 10 },
    },
    tooltip: { ...baseTooltip(p), trigger: "axis" },
    xAxis: {
      type: "category",
      data: rows.map((row) => row.month),
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: { ...monoAxisLabel(p), formatter: (value: string) => formatMonth(value) },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: monoAxisLabel(p),
      splitLine: { lineStyle: { color: p.split } },
    },
    series: stacks.map((stack) => ({
      name: stack.name,
      type: "bar",
      stack: "acquired",
      itemStyle: { color: stack.color },
      data: rows.map((row) => row[stack.field] as number),
    })),
  };
}

/** Purchase → first-listen lag distribution. */
export function lagHistogramOption(buckets: LagBucket[], p: ChartPalette): EChartsOption | null {
  if (buckets.every((bucket) => bucket.count === 0)) return null;
  return {
    grid: { left: 40, right: 12, top: 14, bottom: 30 },
    tooltip: {
      ...baseTooltip(p),
      formatter: (params: unknown) => {
        const { name, value } = params as { name: string; value: number };
        return `${name}: ${value} books`;
      },
    },
    xAxis: {
      type: "category",
      data: buckets.map((bucket) => bucket.label),
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: { ...monoAxisLabel(p), interval: 0, rotate: 24 },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
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
