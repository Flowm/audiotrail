import type { EChartsOption } from "echarts";

import type { SankeyData } from "@/lib/derive/people";

import { baseTooltip } from "./common";
import type { ChartPalette } from "./types";

/**
 * Shared sankey shell. Node names may be prefixed for uniqueness; the bare
 * display text travels in each node's `label` field.
 */
export function sankeyOption(data: SankeyData, p: ChartPalette, formatValue: (value: number) => string): EChartsOption {
  return {
    tooltip: {
      ...baseTooltip(p),
      formatter: (params: unknown) => {
        const {
          dataType,
          data: item,
          value,
        } = params as {
          dataType: "node" | "edge";
          data: { label?: string; source?: string; target?: string };
          value: number;
        };
        if (dataType === "edge") {
          const clean = (name?: string): string => name?.replace(/^[a-z]:/, "") ?? "";
          return `${clean(item.source)} → ${clean(item.target)}: ${formatValue(value)}`;
        }
        return `${item.label ?? ""}: ${formatValue(value)}`;
      },
    },
    series: [
      {
        type: "sankey",
        left: 4,
        right: 120,
        top: 8,
        bottom: 8,
        nodeWidth: 12,
        nodeGap: 10,
        emphasis: { focus: "adjacency" },
        lineStyle: { color: "gradient", opacity: 0.28, curveness: 0.55 },
        label: {
          color: p.textStrong,
          fontSize: 11,
          formatter: (params: unknown) => (params as { data: { label?: string; name: string } }).data.label ?? (params as { name: string }).name,
        },
        data: data.nodes.map((node, index) => ({
          name: node.name,
          label: node.label,
          itemStyle: { color: p.series[index % p.series.length], borderWidth: 0 },
        })),
        links: data.links,
      },
    ],
  } as EChartsOption;
}
