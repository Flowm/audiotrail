import type { EChartsOption } from "echarts";

import type { MonthlySpend, YearCost } from "@/lib/derive/money";
import { formatEur, formatMonth } from "@/lib/format";

import { baseTooltip, MONO, monoAxisLabel, withAlpha } from "./common";
import type { ChartPalette } from "./types";

/** Membership + cash bars per month or year, cumulative line on a second axis. */
export function monthlySpendOption(rows: MonthlySpend[], p: ChartPalette, granularity: "month" | "year" = "month"): EChartsOption | null {
  if (rows.length === 0) return null;
  let runningTotal = 0;
  const cumulative = rows.map((row) => {
    runningTotal += row.membership + row.cash;
    return Math.round(runningTotal * 100) / 100;
  });

  // One gift-buying spree shouldn't flatten years of regular months into
  // slivers: cap the bar axis near the 95th percentile when there's a real
  // outlier, and flag clipped months with their true total. Yearly totals
  // are few and same-order, so they stay uncapped.
  const totals = rows.map((row) => row.membership + row.cash);
  const sorted = totals.toSorted((a, b) => a - b);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0;
  const maxTotal = sorted[sorted.length - 1] ?? 0;
  const cap = granularity === "month" && p95 > 0 && maxTotal > p95 * 1.6 ? Math.ceil((p95 * 1.25) / 5) * 5 : null;
  const clipped = cap === null ? [] : rows.filter((_, index) => totals[index]! > cap);

  return {
    grid: { left: 52, right: 64, top: 30, bottom: 46 },
    legend: {
      top: 0,
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: p.text, fontSize: 10 },
    },
    tooltip: {
      ...baseTooltip(p),
      trigger: "axis",
      valueFormatter: (value) => formatEur(Number(value) || 0),
    },
    xAxis: {
      type: "category",
      data: rows.map((row) => row.month),
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: { ...monoAxisLabel(p), formatter: (value: string) => (granularity === "month" ? formatMonth(value) : value) },
    },
    yAxis: [
      {
        type: "value",
        max: cap ?? undefined,
        axisLabel: { ...monoAxisLabel(p), formatter: "€{value}" },
        splitLine: { lineStyle: { color: p.split } },
      },
      {
        type: "value",
        axisLabel: { ...monoAxisLabel(p), formatter: "€{value}" },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: "membership",
        type: "bar",
        stack: "spend",
        barMaxWidth: 48,
        itemStyle: { color: p.accent },
        data: rows.map((row) => row.membership),
        markPoint:
          cap === null
            ? undefined
            : {
                symbol: "triangle",
                symbolSize: 7,
                itemStyle: { color: p.accent },
                label: {
                  show: true,
                  position: "bottom",
                  distance: 6,
                  color: p.tooltipText,
                  backgroundColor: p.tooltipBg,
                  padding: [2, 5],
                  borderRadius: 3,
                  fontFamily: MONO,
                  fontSize: 9,
                  formatter: (params: unknown) => formatEur(Number((params as { value: number }).value) || 0),
                },
                data: clipped.map((row) => ({
                  name: row.month,
                  coord: [row.month, cap * 0.97],
                  value: Math.round((row.membership + row.cash) * 100) / 100,
                })),
              },
      },
      {
        name: "shop (cash)",
        type: "bar",
        stack: "spend",
        barMaxWidth: 48,
        itemStyle: { color: p.series[1] },
        data: rows.map((row) => row.cash),
      },
      {
        name: "cumulative",
        type: "line",
        yAxisIndex: 1,
        data: cumulative,
        showSymbol: false,
        lineStyle: { color: withAlpha(p.series[4]!, 0.75), width: 1.2 },
        itemStyle: { color: p.series[4] },
      },
    ],
  };
}

/** Effective €/hour per year, €/finished book in the tooltip. */
export function costPerHourOption(years: YearCost[], p: ChartPalette): EChartsOption | null {
  const rows = years.filter((year) => year.costPerHour !== null);
  if (rows.length === 0) return null;
  return {
    grid: { left: 50, right: 14, top: 16, bottom: 28 },
    tooltip: {
      ...baseTooltip(p),
      formatter: (params: unknown) => {
        const { dataIndex } = params as { dataIndex: number };
        const year = rows[dataIndex]!;
        const perBook = year.costPerFinished !== null ? `<br/>${formatEur(year.costPerFinished)} per finished book (${year.finished})` : "";
        return `${year.year}: ${formatEur(year.costPerHour!)} per hour<br/>${formatEur(year.spend)} for ${year.hours} h${perBook}`;
      },
    },
    xAxis: {
      type: "category",
      data: rows.map((year) => String(year.year)),
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: monoAxisLabel(p),
    },
    yAxis: {
      type: "value",
      axisLabel: { ...monoAxisLabel(p), formatter: "€{value}" },
      splitLine: { lineStyle: { color: p.split } },
    },
    series: [
      {
        type: "bar",
        data: rows.map((year) => year.costPerHour),
        barWidth: "50%",
        itemStyle: { color: p.accent, borderRadius: [4, 4, 0, 0] },
        label: {
          show: true,
          position: "top",
          color: p.text,
          fontFamily: "IBM Plex Mono",
          fontSize: 10,
          formatter: (params: unknown) => formatEur((params as { value: number }).value),
        },
      },
    ],
  };
}
