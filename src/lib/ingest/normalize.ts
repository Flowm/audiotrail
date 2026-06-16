import type { IsoDate } from "@/types/models";

/**
 * String literals the takeout uses to mean "no value". 'Empty' appears in
 * PlaybackMetrics, 'UNKNOWN' in Credits, the rest across most CSVs.
 */
const SENTINELS = new Set(["", "Not Available", "Not Applicable", "UNKNOWN", "Empty"]);

export function sentinel(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return SENTINELS.has(trimmed) ? null : trimmed;
}

export function num(value: string | undefined | null): number | null {
  const raw = sentinel(value);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function int(value: string | undefined | null): number | null {
  const parsed = num(value);
  return parsed === null ? null : Math.round(parsed);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Accepts 'YYYY-MM-DD' or a full ISO datetime (keeps the UTC calendar day). */
export function isoDate(value: string | undefined | null): IsoDate | null {
  const raw = sentinel(value);
  if (raw === null) return null;
  const day = raw.slice(0, 10);
  return ISO_DATE_RE.test(day) ? (day as IsoDate) : null;
}

export function epochMs(value: string | undefined | null): number | null {
  const raw = sentinel(value);
  if (raw === null) return null;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

/** 'Yes'/'No' in most CSVs, 'yes'/'no' in SearchData. */
export function yesNo(value: string | undefined | null): boolean | null {
  const raw = sentinel(value);
  if (raw === null) return null;
  if (/^yes$/i.test(raw)) return true;
  if (/^no$/i.test(raw)) return false;
  return null;
}

/** Comma-separated list → trimmed, deduplicated entries. */
export function splitList(value: string | undefined | null): string[] {
  const raw = sentinel(value);
  if (raw === null) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];
}

/** '-1' doubles as a null sentinel in Credits.'Consumed Order'. */
export function orderId(value: string | undefined | null): string | null {
  const raw = sentinel(value);
  return raw === "-1" ? null : raw;
}

/**
 * Maps a 2026-era 'Title Case' CSV header onto the snake_case key the Library
 * and Collections parsers expect ('Book Series Info' → 'book_series_info').
 * 'ASIN' is preserved verbatim, and already-snake_case headers from older
 * exports pass through unchanged, so the same parser reads either layout.
 */
export function titleToSnake(header: string): string {
  if (header === "ASIN") return "ASIN";
  return header.toLowerCase().replace(/ /g, "_");
}
