import type { EChartsOption } from "echarts";

import type { SearchHit } from "@/types/models";

import { baseTooltip, monoAxisLabel } from "./common";
import type { ChartPalette } from "./types";

/** Which result position you actually click (clicked hits only). */
export function clickPositionOption(hits: SearchHit[], p: ChartPalette): EChartsOption | null {
  const clicked = hits.filter((hit) => hit.clicked && hit.position !== null);
  if (clicked.length === 0) return null;

  const MAX_POSITION = 10;
  const counts = Array.from({ length: MAX_POSITION + 1 }, () => 0);
  for (const hit of clicked) {
    const bucket = Math.min(hit.position!, MAX_POSITION + 1) - 1;
    const bucketIndex = Math.min(bucket, MAX_POSITION);
    counts[bucketIndex] = counts[bucketIndex]! + 1;
  }
  const labels = [...Array.from({ length: MAX_POSITION }, (_, i) => `#${i + 1}`), `#${MAX_POSITION + 1}+`];

  return {
    grid: { left: 40, right: 12, top: 16, bottom: 28 },
    tooltip: {
      ...baseTooltip(p),
      formatter: (params: unknown) => {
        const { name, value } = params as { name: string; value: number };
        const share = Math.round((value / clicked.length) * 100);
        return `result ${name}: ${value} clicks (${share}%)`;
      },
    },
    xAxis: {
      type: "category",
      data: labels,
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: { ...monoAxisLabel(p), interval: 0 },
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
        data: counts,
        barWidth: "55%",
        itemStyle: { color: p.accent, borderRadius: [4, 4, 0, 0] },
      },
    ],
  };
}
