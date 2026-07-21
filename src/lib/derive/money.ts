import type { BillingEvent, Credit, Purchase } from "@/types/models";

import type { BookStats } from "./books";
import type { SankeyData } from "./people";
import { monthSpan, yearlyTotals, type DayTotal } from "./time";

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Actual money out for a purchase. Some takeouts (observed on audible.de)
 * leave "Price Paid Member" at 0 even on paid orders; the gross charge is
 * then regular price + tax + discount (discount is negative), which matches
 * the order confirmation emails to the cent. Genuinely free orders come out
 * at 0 either way because their discount cancels the regular price.
 */
export function purchaseOutlay(purchase: Purchase): number {
  const paid = purchase.pricePaid ?? 0;
  if (paid > 0) return paid;
  return Math.max(0, round2((purchase.regularPrice ?? 0) + (purchase.tax ?? 0) + (purchase.discount ?? 0)));
}

// "3 extra Guthaben" / "5 Extra Guthaben" (audible.de), "DE - 3 Credit
// Bundle Purchase" (Apple in-app, saleType ALC), "Audible Guthaben".
const PACK_NAME = /guthaben|credit bundle|extra credit/i;

/** Cash purchases of extra credits — ALOP orders plus app-store bundles. */
export function isCreditPack(purchase: Purchase): boolean {
  if (purchase.type !== "CASH") return false;
  if (purchase.saleType === "ALOP") return true;
  return PACK_NAME.test(purchase.productName ?? "");
}

export interface MonthlySpend {
  /** "YYYY-MM", or a bare "YYYY" after yearlySpend aggregation. */
  month: string;
  membership: number;
  /** Cash purchases of extra credit packs (saleType ALOP). */
  creditPacks: number;
  /** All other cash shop purchases. */
  shop: number;
}

/** Roll monthly spend rows up to calendar years. */
export function yearlySpend(rows: MonthlySpend[]): MonthlySpend[] {
  const byYear = new Map<string, MonthlySpend>();
  for (const row of rows) {
    const year = row.month.slice(0, 4);
    let entry = byYear.get(year);
    if (!entry) {
      entry = { month: year, membership: 0, creditPacks: 0, shop: 0 };
      byYear.set(year, entry);
    }
    entry.membership += row.membership;
    entry.creditPacks += row.creditPacks;
    entry.shop += row.shop;
  }
  return [...byYear.values()].toSorted((a, b) => (a.month < b.month ? -1 : 1));
}

/** Real money out per month: membership charges, credit packs, shop purchases. */
export function monthlySpend(billings: BillingEvent[], purchases: Purchase[]): MonthlySpend[] {
  const byMonth = new Map<string, MonthlySpend>();
  const bucket = (month: string): MonthlySpend => {
    let entry = byMonth.get(month);
    if (!entry) {
      entry = { month, membership: 0, creditPacks: 0, shop: 0 };
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
    const entry = bucket(purchase.orderPlaceDate.slice(0, 7));
    if (isCreditPack(purchase)) entry.creditPacks += purchaseOutlay(purchase);
    else entry.shop += purchaseOutlay(purchase);
  }
  const months = [...byMonth.keys()].toSorted();
  if (months.length === 0) return [];
  return monthSpan(months[0]!, months[months.length - 1]!).map((month) => {
    const entry = byMonth.get(month) ?? { month, membership: 0, creditPacks: 0, shop: 0 };
    return { month, membership: round2(entry.membership), creditPacks: round2(entry.creditPacks), shop: round2(entry.shop) };
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
    spendByYear.set(year, (spendByYear.get(year) ?? 0) + purchaseOutlay(purchase));
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
  /** Gross cash value of everything bought with credits. */
  valueAtCashPrice: number;
  membershipCost: number;
  creditPackCost: number;
  saved: number;
  creditPurchaseCount: number;
}

/**
 * Gross cash price of a single order. Prices are recorded net; the cash
 * equivalent is price + charged tax, or price × (1 + rate). Credit orders
 * carry neither Tax nor a Tax Rate (the pack was taxed instead), so the
 * caller passes the account's dominant VAT rate observed on cash orders.
 * Without this the comparison below would put a net alternative against
 * gross actual costs and understate savings by one VAT.
 */
function grossCashPrice(purchase: Purchase, fallbackRate: number): number {
  const net = purchase.regularPrice ?? 0;
  const tax = purchase.tax ?? 0;
  if (tax > 0) return net + tax;
  const rate = purchase.taxRate !== null && purchase.taxRate > 0 ? purchase.taxRate : fallbackRate;
  return net * (1 + rate);
}

export function creditsSavings(purchases: Purchase[], billings: BillingEvent[]): CreditSavings {
  const rateCounts = new Map<number, number>();
  for (const purchase of purchases) {
    if (purchase.taxRate !== null && purchase.taxRate > 0) {
      rateCounts.set(purchase.taxRate, (rateCounts.get(purchase.taxRate) ?? 0) + 1);
    }
  }
  const fallbackRate = [...rateCounts.entries()].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? 0;

  let valueAtCashPrice = 0;
  let creditPurchaseCount = 0;
  let creditPackCost = 0;
  for (const purchase of purchases) {
    if (purchase.consumedCredit === 1) {
      valueAtCashPrice += grossCashPrice(purchase, fallbackRate);
      creditPurchaseCount += 1;
    }
    if (isCreditPack(purchase)) {
      creditPackCost += purchaseOutlay(purchase);
    }
  }
  const membershipCost = billings.filter((billing) => billing.type === "Charge").reduce((sum, billing) => sum + (billing.totalAmount ?? 0), 0);
  return {
    valueAtCashPrice: round2(valueAtCashPrice),
    membershipCost: round2(membershipCost),
    creditPackCost: round2(creditPackCost),
    saved: round2(valueAtCashPrice - membershipCost - creditPackCost),
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
