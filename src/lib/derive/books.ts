import type { IsoDate, LibraryItem, ListeningSession } from "@/types/models";

export interface BookStats {
  /** ASIN when known, otherwise a normalized product-name key. */
  key: string;
  asin: string | null;
  title: string;
  library: LibraryItem | null;
  totalMs: number;
  sessionCount: number;
  daysListened: number;
  firstListen: IsoDate | null;
  lastListen: IsoDate | null;
  bookLengthMs: number | null;
  maxEndPositionMs: number | null;
  /** clamp(maxEndPosition / bookLength, 0, 1); null without a known length. */
  completion: number | null;
  /** Audible's own flag, or ≥ 99% position-based completion. */
  finished: boolean;
}

export interface BookStatsResult {
  /** Listened books (FullTitle only) plus never-listened library items. */
  books: BookStats[];
  /** Distinct previews/samples played (excluded from books). */
  samplesBrowsed: number;
  /** Listened books that matched no library item. */
  unmatchedListened: number;
}

const FINISH_THRESHOLD = 0.99;

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Stable book identity shared by every session-level aggregation. */
export function bookKey(asin: string | null, productName: string): string {
  return asin ?? `name:${normalizeTitle(productName)}`;
}

interface Accumulator {
  key: string;
  asin: string | null;
  productName: string;
  library: LibraryItem | null;
  totalMs: number;
  sessionCount: number;
  days: Set<IsoDate>;
  firstListen: IsoDate | null;
  lastListen: IsoDate | null;
  bookLengthMs: number | null;
  maxEndPositionMs: number | null;
}

/**
 * Joins listening to the merged library. Sessions group by their own ASIN /
 * product name (multi-part books keep per-part entries so position-based
 * completion stays meaningful); the matched library item is attached for
 * metadata. Library items never listened to are appended with zero time.
 */
export function buildBookStats(sessions: ListeningSession[], library: LibraryItem[]): BookStatsResult {
  const libraryByAsin = new Map(library.map((item) => [item.asin, item]));
  const libraryByTitle = new Map<string, LibraryItem>();
  for (const item of library) {
    const normalized = normalizeTitle(item.title);
    if (!libraryByTitle.has(normalized)) libraryByTitle.set(normalized, item);
  }

  const accumulators = new Map<string, Accumulator>();
  const sampledKeys = new Set<string>();
  const usedLibraryAsins = new Set<string>();

  for (const session of sessions) {
    const key = bookKey(session.asin, session.productName);
    if (session.audioType !== "FullTitle") {
      sampledKeys.add(key);
      continue;
    }

    let entry = accumulators.get(key);
    if (!entry) {
      const matched = (session.asin !== null ? libraryByAsin.get(session.asin) : undefined) ?? libraryByTitle.get(normalizeTitle(session.productName)) ?? null;
      if (matched) usedLibraryAsins.add(matched.asin);
      entry = {
        key,
        asin: session.asin,
        productName: session.productName,
        library: matched,
        totalMs: 0,
        sessionCount: 0,
        days: new Set(),
        firstListen: null,
        lastListen: null,
        bookLengthMs: null,
        maxEndPositionMs: null,
      };
      accumulators.set(key, entry);
    }

    entry.totalMs += session.durationMs;
    entry.sessionCount += 1;
    entry.days.add(session.startDate);
    if (entry.firstListen === null || session.startDate < entry.firstListen) {
      entry.firstListen = session.startDate;
    }
    if (entry.lastListen === null || session.startDate > entry.lastListen) {
      entry.lastListen = session.startDate;
    }
    if (session.bookLengthMs !== null) {
      entry.bookLengthMs = Math.max(entry.bookLengthMs ?? 0, session.bookLengthMs);
    }
    if (session.endPositionMs !== null) {
      entry.maxEndPositionMs = Math.max(entry.maxEndPositionMs ?? 0, session.endPositionMs);
    }
  }

  const books: BookStats[] = [];
  let unmatchedListened = 0;

  for (const entry of accumulators.values()) {
    const lengthMs = entry.bookLengthMs ?? (entry.library?.lengthMinutes != null ? entry.library.lengthMinutes * 60_000 : null);
    const completion = lengthMs !== null && lengthMs > 0 && entry.maxEndPositionMs !== null ? Math.min(1, Math.max(0, entry.maxEndPositionMs / lengthMs)) : null;
    if (entry.library === null) unmatchedListened += 1;
    books.push({
      key: entry.key,
      asin: entry.asin,
      title: entry.productName,
      library: entry.library,
      totalMs: entry.totalMs,
      sessionCount: entry.sessionCount,
      daysListened: entry.days.size,
      firstListen: entry.firstListen,
      lastListen: entry.lastListen,
      bookLengthMs: lengthMs,
      maxEndPositionMs: entry.maxEndPositionMs,
      completion,
      finished: entry.library?.isFinished === true || (completion !== null && completion >= FINISH_THRESHOLD),
    });
  }

  for (const item of library) {
    if (usedLibraryAsins.has(item.asin)) continue;
    books.push({
      key: item.asin,
      asin: item.asin,
      title: item.title,
      library: item,
      totalMs: 0,
      sessionCount: 0,
      daysListened: 0,
      firstListen: null,
      lastListen: null,
      bookLengthMs: item.lengthMinutes != null ? item.lengthMinutes * 60_000 : null,
      maxEndPositionMs: null,
      completion: null,
      finished: item.isFinished === true,
    });
  }

  books.sort((a, b) => b.totalMs - a.totalMs);
  return { books, samplesBrowsed: sampledKeys.size, unmatchedListened };
}
