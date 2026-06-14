import type { BillingEvent, ListeningSession, Purchase } from "@/types/models";

import { bookKey, type BookStats } from "./books";
import { biggestDays, dailyTotals, longestStreak, monthlyTotals, type BigDay, type StreakInfo } from "./time";

export interface WrappedHighlight {
  name: string;
  ms: number;
}

export interface WrappedStats {
  year: number;
  totalMs: number;
  sessions: number;
  daysActive: number;
  /** Share of the year's calendar days with any listening. */
  activeDayShare: number;
  topBook: (WrappedHighlight & { asin: string | null }) | null;
  topAuthor: WrappedHighlight | null;
  topNarrator: WrappedHighlight | null;
  biggestDay: BigDay | null;
  longestStreak: StreakInfo;
  busiestMonth: { month: string; ms: number } | null;
  booksStarted: number;
  booksFinished: number;
  /** Membership charges + cash purchases in the year; null without money data. */
  spend: number | null;
  costPerHour: number | null;
  /** Books left hanging at 85–99% whose last session was this year. */
  almostFinished: { title: string; completion: number }[];
}

const FULL_YEAR_DAYS = 365;

export function wrappedStats(year: number, sessions: ListeningSession[], books: BookStats[], billings: BillingEvent[], purchases: Purchase[]): WrappedStats {
  const prefix = `${year}-`;
  const yearSessions = sessions.filter((session) => session.startDate.startsWith(prefix));
  const days = dailyTotals(yearSessions);
  const totalMs = days.reduce((sum, day) => sum + day.ms, 0);

  // per-book time inside the year, mapped onto the global book stats
  const msByBook = new Map<string, number>();
  const titleByBook = new Map<string, string>();
  for (const session of yearSessions) {
    if (session.audioType !== "FullTitle") continue;
    const key = bookKey(session.asin, session.productName);
    msByBook.set(key, (msByBook.get(key) ?? 0) + session.durationMs);
    const known = titleByBook.get(key);
    if (known === undefined || session.productName.length < known.length) {
      titleByBook.set(key, session.productName);
    }
  }

  let topBook: WrappedStats["topBook"] = null;
  for (const [key, ms] of msByBook) {
    if (topBook === null || ms > topBook.ms) {
      topBook = { name: titleByBook.get(key) ?? key, ms, asin: key.startsWith("name:") ? null : key };
    }
  }

  const authorMs = new Map<string, number>();
  const narratorMs = new Map<string, number>();
  for (const book of books) {
    const ms = msByBook.get(book.key);
    if (ms === undefined || ms === 0 || book.library === null) continue;
    for (const author of book.library.authors) {
      authorMs.set(author, (authorMs.get(author) ?? 0) + ms);
    }
    for (const narrator of book.library.narrators) {
      narratorMs.set(narrator, (narratorMs.get(narrator) ?? 0) + ms);
    }
  }
  const best = (entries: Map<string, number>): WrappedHighlight | null => {
    let top: WrappedHighlight | null = null;
    for (const [name, ms] of entries) {
      if (top === null || ms > top.ms) top = { name, ms };
    }
    return top;
  };

  const months = monthlyTotals(days);
  const busiestMonth = months.reduce<{ month: string; ms: number } | null>((currentBest, entry) => (currentBest === null || entry.ms > currentBest.ms ? entry : currentBest), null);

  const booksStarted = books.filter((book) => book.firstListen?.startsWith(prefix)).length;
  const booksFinished = books.filter((book) => book.finished && book.lastListen?.startsWith(prefix)).length;

  const membership = billings
    .filter((billing) => billing.type === "Charge" && billing.billingDate.startsWith(prefix))
    .reduce((sum, billing) => sum + (billing.totalAmount ?? 0), 0);
  const cash = purchases.filter((purchase) => purchase.type === "CASH" && purchase.orderPlaceDate.startsWith(prefix)).reduce((sum, purchase) => sum + (purchase.pricePaid ?? 0), 0);
  const hasMoneyData = billings.length > 0 || purchases.length > 0;
  const spend = hasMoneyData ? Math.round((membership + cash) * 100) / 100 : null;

  const almostFinished = books
    .filter((book) => book.completion !== null && book.completion >= 0.85 && book.completion < 0.99 && !book.finished && book.lastListen?.startsWith(prefix))
    .sort((a, b) => b.completion! - a.completion!)
    .slice(0, 3)
    .map((book) => ({ title: book.title, completion: book.completion! }));

  return {
    year,
    totalMs,
    sessions: yearSessions.length,
    daysActive: days.length,
    activeDayShare: days.length / FULL_YEAR_DAYS,
    topBook,
    topAuthor: best(authorMs),
    topNarrator: best(narratorMs),
    biggestDay: biggestDays(yearSessions, 1)[0] ?? null,
    longestStreak: longestStreak(days),
    busiestMonth,
    booksStarted,
    booksFinished,
    spend,
    costPerHour: spend !== null && totalMs > 0 ? Math.round((spend / (totalMs / 3_600_000)) * 100) / 100 : null,
    almostFinished,
  };
}
