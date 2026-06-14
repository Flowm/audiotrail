import type { ChartPalette } from "./types";

export const MONO = "'IBM Plex Mono', ui-monospace, monospace";

export function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function baseTooltip(p: ChartPalette): Record<string, unknown> {
  return {
    backgroundColor: p.tooltipBg,
    borderWidth: 0,
    padding: [8, 12],
    textStyle: { color: p.tooltipText, fontSize: 12, fontFamily: MONO },
    confine: true,
  };
}

export function monoAxisLabel(p: ChartPalette): Record<string, unknown> {
  return { color: p.text, fontFamily: MONO, fontSize: 10 };
}

/** '#rrggbb' + opacity (0..1) → '#rrggbbaa'. */
export function withAlpha(hex: string, opacity: number): string {
  const alpha = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${alpha}`;
}
