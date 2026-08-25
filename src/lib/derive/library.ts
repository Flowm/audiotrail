import type { LibraryItem, Purchase } from "@/types/models";

import type { BookStats } from "./books";
import { isCreditPack, purchaseOutlay } from "./money";
import { monthSpan } from "./time";

const DAY_MS = 86_400_000;

export interface LagBucket {
  label: string;
  count: number;
}

export interface BacklogStats {
  /** Owned (not revoked), never listened — newest purchase first. */
  neverListened: BookStats[];
  /** Combined runtime of the backlog. */
  backlogMs: number;
  /** Days between purchase and first listen, one entry per listened book. */
  lagsDays: number[];
  medianLagDays: number | null;
  lagBuckets: LagBucket[];
}

const LAG_BUCKETS: { label: string; maxDays: number }[] = [
  { label: "same day", maxDays: 1 },
  { label: "≤ 1 week", maxDays: 7 },
  { label: "≤ 1 month", maxDays: 31 },
  { label: "≤ 3 months", maxDays: 92 },
  { label: "≤ 1 year", maxDays: 366 },
  { label: "over a year", maxDays: Number.POSITIVE_INFINITY },
];

export function backlogStats(books: BookStats[]): BacklogStats {
  const neverListened = books
    .filter((book) => book.totalMs === 0 && book.library !== null && book.library.ownership !== "Revoked")
    .toSorted((a, b) => (b.library?.purchaseDate ?? 0) - (a.library?.purchaseDate ?? 0));

  const backlogMs = neverListened.reduce((sum, book) => sum + (book.bookLengthMs ?? 0), 0);

  const lagsDays: number[] = [];
  for (const book of books) {
    if (book.totalMs === 0 || book.firstListen === null) continue;
    const purchased = book.library?.purchaseDate;
    if (purchased == null) continue;
    const listened = Date.parse(`${book.firstListen}T00:00:00Z`);
    const days = Math.floor((listened - purchased) / DAY_MS);
    if (days >= 0) lagsDays.push(days);
  }
  lagsDays.sort((a, b) => a - b);

  const medianLagDays =
    lagsDays.length === 0
      ? null
      : lagsDays.length % 2 === 1
        ? lagsDays[(lagsDays.length - 1) / 2]!
        : Math.round((lagsDays[lagsDays.length / 2 - 1]! + lagsDays[lagsDays.length / 2]!) / 2);

  const lagBuckets = LAG_BUCKETS.map((bucket) => ({ label: bucket.label, count: 0 }));
  for (const days of lagsDays) {
    const index = LAG_BUCKETS.findIndex((bucket) => days < bucket.maxDays);
    lagBuckets[index === -1 ? lagBuckets.length - 1 : index]!.count += 1;
  }

  return { neverListened, backlogMs, lagsDays, medianLagDays, lagBuckets };
}

/** What a book cost: gross EUR including tax, or one credit. */
export type Acquisition = { kind: "cash"; eur: number } | { kind: "credit" };

/**
 * Price per ASIN. Credit packs are skipped: they carry an ASIN of their own
 * and would otherwise price a book at the pack's cost. An ASIN bought twice
 * (returned, then rebought) keeps its earliest order, as acquisitionsByMonth
 * does.
 */
export function acquisitionByAsin(purchases: Purchase[]): Map<string, Acquisition> {
  const byAsin = new Map<string, Acquisition>();
  for (const purchase of purchases) {
    if (purchase.asin === null || byAsin.has(purchase.asin) || isCreditPack(purchase)) continue;
    if (purchase.type === "CREDIT" || purchase.consumedCredit === 1) {
      byAsin.set(purchase.asin, { kind: "credit" });
    } else if (purchase.type === "CASH") {
      byAsin.set(purchase.asin, { kind: "cash", eur: purchaseOutlay(purchase) });
    }
  }
  return byAsin;
}

export interface AcquisitionMonth {
  month: string;
  credit: number;
  cash: number;
  other: number;
}

/**
 * Books acquired per month, classified by how they were paid: a matching
 * CREDIT purchase, a matching CASH purchase, or anything else (Plus catalog,
 * gifts, unmatched orders).
 */
export function acquisitionsByMonth(library: LibraryItem[], purchases: Purchase[]): AcquisitionMonth[] {
  const typeByAsin = new Map<string, string>();
  for (const purchase of purchases) {
    if (purchase.asin !== null && purchase.type !== null && !typeByAsin.has(purchase.asin)) {
      typeByAsin.set(purchase.asin, purchase.type);
    }
  }

  const byMonth = new Map<string, AcquisitionMonth>();
  for (const item of library) {
    if (item.purchaseDate === null) continue;
    const month = new Date(item.purchaseDate).toISOString().slice(0, 7);
    let entry = byMonth.get(month);
    if (!entry) {
      entry = { month, credit: 0, cash: 0, other: 0 };
      byMonth.set(month, entry);
    }
    const type = typeByAsin.get(item.asin);
    if (type === "CREDIT") entry.credit += 1;
    else if (type === "CASH") entry.cash += 1;
    else entry.other += 1;
  }

  const months = [...byMonth.keys()].toSorted();
  if (months.length === 0) return [];
  return monthSpan(months[0]!, months[months.length - 1]!).map((month) => byMonth.get(month) ?? { month, credit: 0, cash: 0, other: 0 });
}
