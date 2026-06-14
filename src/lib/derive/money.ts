import type { BillingEvent, Credit, Purchase } from "@/types/models";

import type { BookStats } from "./books";
import type { SankeyData } from "./people";
import { monthSpan, yearlyTotals, type DayTotal } from "./time";

const round2 = (value: number): number => Math.round(value * 100) / 100;

export interface MonthlySpend {
  month: string;
  membership: number;
  cash: number;
}

/** Real money out per month: membership charges + cash shop purchases. */
export function monthlySpend(billings: BillingEvent[], purchases: Purchase[]): MonthlySpend[] {
  const byMonth = new Map<string, MonthlySpend>();
  const bucket = (month: string): MonthlySpend => {
    let entry = byMonth.get(month);
    if (!entry) {
      entry = { month, membership: 0, cash: 0 };
      byMonth.set(month, entry);
    }
    return entry;
  };
  for (const billing of billings) {
    if (billing.type !== "Charge") continue;
    bucket(billing.billingDate.slice(0, 7)).membership += billing.totalAmount ?? 0;
  }
  for (const purchase of purchases) {
    if (purchase.type !== "CASH") continue;
    bucket(purchase.orderPlaceDate.slice(0, 7)).cash += purchase.pricePaid ?? 0;
  }
  const months = [...byMonth.keys()].toSorted();
  if (months.length === 0) return [];
  return monthSpan(months[0]!, months[months.length - 1]!).map((month) => {
    const entry = byMonth.get(month) ?? { month, membership: 0, cash: 0 };
    return { month, membership: round2(entry.membership), cash: round2(entry.cash) };
  });
}

export interface CreditFlow {
  earnedByReason: { reason: string; count: number }[];
  total: number;
  consumed: number;
  expired: number;
  active: number;
}

/** Every credit ends up in exactly one bucket: spent, expired, or active. */
export function creditFlow(credits: Credit[]): CreditFlow {
  const byReason = new Map<string, number>();
  let consumed = 0;
  let expired = 0;
  let active = 0;
  for (const credit of credits) {
    const reason = credit.reason ?? "Other";
    byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
    if (credit.consumed) consumed += 1;
    else if (credit.isActive === false) expired += 1;
    else active += 1;
  }
  return {
    earnedByReason: [...byReason.entries()].map(([reason, count]) => ({ reason, count })).toSorted((a, b) => b.count - a.count),
    total: credits.length,
    consumed,
    expired,
    active,
  };
}

export function creditSankeyData(flow: CreditFlow): SankeyData {
  const nodes: SankeyData["nodes"] = [];
  const links: SankeyData["links"] = [];
  const center = `${flow.total} credits`;
  for (const { reason, count } of flow.earnedByReason) {
    nodes.push({ name: `r:${reason}`, label: reason });
    links.push({ source: `r:${reason}`, target: center, value: count });
  }
  nodes.push({ name: center, label: center });
  const outcomes: [string, number][] = [
    ["Spent", flow.consumed],
    ["Expired", flow.expired],
    ["Still active", flow.active],
  ];
  for (const [label, count] of outcomes) {
    if (count === 0) continue;
    nodes.push({ name: `o:${label}`, label });
    links.push({ source: center, target: `o:${label}`, value: count });
  }
  return { nodes, links };
}

export interface YearCost {
  year: number;
  spend: number;
  hours: number;
  costPerHour: number | null;
  finished: number;
  costPerFinished: number | null;
}

export function costPerYear(billings: BillingEvent[], purchases: Purchase[], days: DayTotal[], books: BookStats[]): YearCost[] {
  const spendByYear = new Map<number, number>();
  for (const billing of billings) {
    if (billing.type !== "Charge") continue;
    const year = Number(billing.billingDate.slice(0, 4));
    spendByYear.set(year, (spendByYear.get(year) ?? 0) + (billing.totalAmount ?? 0));
  }
  for (const purchase of purchases) {
    if (purchase.type !== "CASH") continue;
    const year = Number(purchase.orderPlaceDate.slice(0, 4));
    spendByYear.set(year, (spendByYear.get(year) ?? 0) + (purchase.pricePaid ?? 0));
  }

  const hoursByYear = new Map(yearlyTotals(days).map((entry) => [entry.year, entry.ms / 3_600_000]));
  const finishedByYear = new Map<number, number>();
  for (const book of books) {
    if (!book.finished || book.lastListen === null) continue;
    const year = Number(book.lastListen.slice(0, 4));
    finishedByYear.set(year, (finishedByYear.get(year) ?? 0) + 1);
  }

  const years = [...new Set([...spendByYear.keys(), ...hoursByYear.keys()])].toSorted();
  return years.map((year) => {
    const spend = round2(spendByYear.get(year) ?? 0);
    const hours = hoursByYear.get(year) ?? 0;
    const finished = finishedByYear.get(year) ?? 0;
    return {
      year,
      spend,
      hours: Math.round(hours * 10) / 10,
      costPerHour: hours > 0 ? round2(spend / hours) : null,
      finished,
      costPerFinished: finished > 0 ? round2(spend / finished) : null,
    };
  });
}

export interface CreditSavings {
  /** List-price value of everything bought with credits. */
  valueAtListPrice: number;
  membershipCost: number;
  creditPackCost: number;
  saved: number;
  creditPurchaseCount: number;
}

export function creditsSavings(purchases: Purchase[], billings: BillingEvent[]): CreditSavings {
  let valueAtListPrice = 0;
  let creditPurchaseCount = 0;
  let creditPackCost = 0;
  for (const purchase of purchases) {
    if (purchase.consumedCredit === 1) {
      valueAtListPrice += purchase.regularPrice ?? 0;
      creditPurchaseCount += 1;
    }
    if (purchase.type === "CASH" && purchase.saleType === "ALOP") {
      creditPackCost += purchase.pricePaid ?? 0;
    }
  }
  const membershipCost = billings.filter((billing) => billing.type === "Charge").reduce((sum, billing) => sum + (billing.totalAmount ?? 0), 0);
  return {
    valueAtListPrice: round2(valueAtListPrice),
    membershipCost: round2(membershipCost),
    creditPackCost: round2(creditPackCost),
    saved: round2(valueAtListPrice - membershipCost - creditPackCost),
    creditPurchaseCount,
  };
}

const DAY_MS = 86_400_000;

/** Unused, still-active credits expiring within the window. */
export function expiringCredits(credits: Credit[], now: number, withinDays = 90): Credit[] {
  return credits
    .filter((credit) => {
      if (credit.consumed || credit.isActive !== true || credit.expireDate === null) return false;
      const expires = Date.parse(`${credit.expireDate}T00:00:00Z`);
      const daysLeft = (expires - now) / DAY_MS;
      return daysLeft >= 0 && daysLeft <= withinDays;
    })
    .toSorted((a, b) => (a.expireDate! < b.expireDate! ? -1 : 1));
}

export function unusedActiveCredits(credits: Credit[]): number {
  return credits.filter((credit) => !credit.consumed && credit.isActive === true).length;
}
