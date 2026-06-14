const intFmt = new Intl.NumberFormat("en");
const eurFmt = new Intl.NumberFormat("en", { style: "currency", currency: "EUR" });
const dateFmt = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" });

export function formatNumber(value: number): string {
  return intFmt.format(Math.round(value));
}

export function formatEur(amount: number): string {
  return eurFmt.format(amount);
}

/** Adaptive duration: "42 min", "3 h 5 min", "1,234 h". */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  if (hours >= 100) return `${intFmt.format(hours)} h`;
  return `${hours} h ${totalMinutes % 60} min`;
}

/** Hours with one decimal under 100 h: "5.3 h", "812 h". */
export function formatHours(ms: number): string {
  const hours = ms / 3_600_000;
  if (hours >= 100) return `${intFmt.format(Math.round(hours))} h`;
  return `${hours.toFixed(1).replace(/\.0$/, "")} h`;
}

/**
 * Formats date-only strings ('YYYY-MM-DD'), ISO datetimes and epoch ms.
 * Date-only values are pinned to UTC so the rendered day never shifts.
 */
export function formatDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const date = typeof value === "string" && !value.includes("T") ? new Date(`${value}T00:00:00Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFmt.format(date);
}

/** 'YYYY-MM' → 'Apr 2026'. */
export function formatMonth(yearMonth: string): string {
  const date = new Date(`${yearMonth}-01T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? yearMonth : monthFmt.format(date);
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
