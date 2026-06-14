import type { ListeningSession } from "@/types/models";

import { bookKey, type BookStats } from "./books";
import { monthSpan } from "./time";

export interface PersonStats {
  name: string;
  totalMs: number;
  bookCount: number;
  finishedCount: number;
}

function accumulate(books: BookStats[], pick: (book: BookStats) => string[]): PersonStats[] {
  const byName = new Map<string, PersonStats>();
  for (const book of books) {
    for (const name of pick(book)) {
      let entry = byName.get(name);
      if (!entry) {
        entry = { name, totalMs: 0, bookCount: 0, finishedCount: 0 };
        byName.set(name, entry);
      }
      entry.totalMs += book.totalMs;
      entry.bookCount += 1;
      if (book.finished) entry.finishedCount += 1;
    }
  }
  return [...byName.values()].sort((a, b) => b.totalMs - a.totalMs);
}

export function authorStats(books: BookStats[]): PersonStats[] {
  return accumulate(books, (book) => book.library?.authors ?? []);
}

export function narratorStats(books: BookStats[]): PersonStats[] {
  return accumulate(books, (book) => book.library?.narrators ?? []);
}

export interface SeriesStats {
  key: string;
  title: string;
  owned: number;
  started: number;
  finished: number;
  totalMs: number;
}

export function seriesStats(books: BookStats[]): SeriesStats[] {
  const byKey = new Map<string, SeriesStats>();
  for (const book of books) {
    // a book in several series (saga + universe) counts toward each
    for (const series of book.library?.series ?? []) {
      const key = series.asin ?? series.title;
      let entry = byKey.get(key);
      if (!entry) {
        entry = { key, title: series.title, owned: 0, started: 0, finished: 0, totalMs: 0 };
        byKey.set(key, entry);
      }
      entry.owned += 1;
      if (book.totalMs > 0) entry.started += 1;
      if (book.finished) entry.finished += 1;
      entry.totalMs += book.totalMs;
    }
  }
  return [...byKey.values()].sort((a, b) => b.totalMs - a.totalMs);
}

export interface MonthlyAuthorHours {
  months: string[];
  series: { name: string; data: number[] }[];
}

/** Monthly hours for the top-N authors (by total time) — author eras. */
export function monthlyAuthorHours(sessions: ListeningSession[], books: BookStats[], topN = 5): MonthlyAuthorHours {
  const authorByBook = new Map<string, string>();
  for (const book of books) {
    const author = book.library?.authors[0];
    if (author !== undefined) authorByBook.set(book.key, author);
  }

  const totals = new Map<string, number>();
  const perMonth = new Map<string, Map<string, number>>();
  for (const session of sessions) {
    if (session.audioType !== "FullTitle") continue;
    const author = authorByBook.get(bookKey(session.asin, session.productName));
    if (author === undefined) continue;
    totals.set(author, (totals.get(author) ?? 0) + session.durationMs);
    const month = session.startDate.slice(0, 7);
    let bucket = perMonth.get(month);
    if (!bucket) {
      bucket = new Map();
      perMonth.set(month, bucket);
    }
    bucket.set(author, (bucket.get(author) ?? 0) + session.durationMs);
  }

  if (perMonth.size === 0) return { months: [], series: [] };
  const monthKeys = [...perMonth.keys()].sort();
  const months = monthSpan(monthKeys[0]!, monthKeys[monthKeys.length - 1]!);
  const top = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name]) => name);

  return {
    months,
    series: top.map((name) => ({
      name,
      data: months.map((month) => Math.round(((perMonth.get(month)?.get(name) ?? 0) / 3_600_000) * 10) / 10),
    })),
  };
}

export interface SeriesEras {
  months: string[];
  /** Top-N series by total hours, with hours-per-month. */
  groups: { title: string; data: number[] }[];
  /** Everything not in the top series (other series + standalone books). */
  other: number[];
}

const msToHours = (ms: number): number => Math.round(ms / 360_000) / 10;

/**
 * Monthly listening hours grouped by series — the "eras" chart. A book in
 * several series (e.g. a saga inside a wider universe) is attributed to its
 * most specific one: the series with the fewest owned books. Standalone books
 * and series outside the top-N fold into `other`, so each month's stack still
 * sums to that month's total listening.
 */
export function monthlySeriesHours(sessions: ListeningSession[], books: BookStats[], topN = 8): SeriesEras {
  // Owned-book count per series, used to pick the most specific membership.
  const seriesSize = new Map<string, number>();
  for (const book of books) {
    for (const ref of book.library?.series ?? []) {
      const key = ref.asin ?? ref.title;
      seriesSize.set(key, (seriesSize.get(key) ?? 0) + 1);
    }
  }

  const primaryByBook = new Map<string, { key: string; title: string }>();
  for (const book of books) {
    const refs = book.library?.series ?? [];
    if (refs.length === 0) continue;
    let best = refs[0]!;
    let bestSize = seriesSize.get(best.asin ?? best.title) ?? Number.POSITIVE_INFINITY;
    for (const ref of refs.slice(1)) {
      const size = seriesSize.get(ref.asin ?? ref.title) ?? Number.POSITIVE_INFINITY;
      if (size < bestSize || (size === bestSize && ref.title < best.title)) {
        best = ref;
        bestSize = size;
      }
    }
    primaryByBook.set(book.key, { key: best.asin ?? best.title, title: best.title });
  }

  const totals = new Map<string, number>();
  const titleByKey = new Map<string, string>();
  // null key = standalone / no series
  const perMonth = new Map<string, Map<string | null, number>>();
  for (const session of sessions) {
    if (session.audioType !== "FullTitle") continue;
    const primary = primaryByBook.get(bookKey(session.asin, session.productName)) ?? null;
    const key = primary?.key ?? null;
    if (primary) {
      totals.set(primary.key, (totals.get(primary.key) ?? 0) + session.durationMs);
      titleByKey.set(primary.key, primary.title);
    }
    const month = session.startDate.slice(0, 7);
    let bucket = perMonth.get(month);
    if (!bucket) {
      bucket = new Map();
      perMonth.set(month, bucket);
    }
    bucket.set(key, (bucket.get(key) ?? 0) + session.durationMs);
  }

  if (perMonth.size === 0) return { months: [], groups: [], other: [] };

  const monthKeys = [...perMonth.keys()].sort();
  const months = monthSpan(monthKeys[0]!, monthKeys[monthKeys.length - 1]!);
  const topKeys = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([key]) => key);
  const topSet = new Set(topKeys);

  const groups = topKeys.map((key) => ({
    title: titleByKey.get(key) ?? key,
    data: months.map((month) => msToHours(perMonth.get(month)?.get(key) ?? 0)),
  }));
  const other = months.map((month) => {
    let rest = 0;
    for (const [key, ms] of perMonth.get(month) ?? []) {
      if (key === null || !topSet.has(key)) rest += ms;
    }
    return msToHours(rest);
  });

  return { months, groups, other };
}

export interface SankeyData {
  nodes: { name: string; label: string }[];
  links: { source: string; target: string; value: number }[];
}

/**
 * Author → narrator flows weighted by listening hours. Node names are
 * prefixed ('a:' / 'n:') so a person appearing on both sides cannot create
 * a cycle; the display label carries the bare name.
 */
export function authorNarratorSankey(books: BookStats[], maxAuthors = 10): SankeyData {
  const linkMs = new Map<string, number>();
  const authorTotals = new Map<string, number>();

  for (const book of books) {
    if (book.totalMs === 0 || !book.library) continue;
    const author = book.library.authors[0];
    const narrators = book.library.narrators;
    if (author === undefined || narrators.length === 0) continue;
    authorTotals.set(author, (authorTotals.get(author) ?? 0) + book.totalMs);
    const share = book.totalMs / narrators.length;
    for (const narrator of narrators) {
      const key = `${author}\u0000${narrator}`;
      linkMs.set(key, (linkMs.get(key) ?? 0) + share);
    }
  }

  const topAuthors = new Set(
    [...authorTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxAuthors)
      .map(([name]) => name),
  );

  const nodes = new Map<string, string>();
  const links: SankeyData["links"] = [];
  for (const [key, ms] of linkMs) {
    const [author, narrator] = key.split("\u0000") as [string, string];
    if (!topAuthors.has(author)) continue;
    const hours = Math.round((ms / 3_600_000) * 10) / 10;
    if (hours <= 0) continue;
    nodes.set(`a:${author}`, author);
    nodes.set(`n:${narrator}`, narrator);
    links.push({ source: `a:${author}`, target: `n:${narrator}`, value: hours });
  }

  return {
    nodes: [...nodes.entries()].map(([name, label]) => ({ name, label })),
    links,
  };
}
