import { describe, expect, it } from "vitest";

import { isoDate } from "@/lib/ingest/normalize";
import type { IsoDate, LibraryItem, Purchase } from "@/types/models";

import type { BookStats } from "./books";
import { acquisitionByAsin, acquisitionsByMonth, backlogStats } from "./library";

const d = (s: string): IsoDate => isoDate(s)!;

function book(over: Partial<BookStats> & { key: string }): BookStats {
  return {
    asin: over.key,
    title: over.key,
    library: null,
    totalMs: 0,
    sessionCount: 0,
    daysListened: 0,
    firstListen: null,
    lastListen: null,
    bookLengthMs: null,
    maxEndPositionMs: null,
    completion: null,
    finished: false,
    ...over,
  };
}

function libraryItem(over: Partial<LibraryItem> & { asin: string }): LibraryItem {
  return {
    title: over.asin,
    subtitle: null,
    lengthMinutes: null,
    authors: [],
    narrators: [],
    purchaseDate: null,
    lastUpdated: null,
    isFinished: null,
    ownership: "Active",
    availableInLibrary: true,
    language: null,
    publisher: null,
    series: [],
    contentDeliveryType: null,
    acquisitionMethod: null,
    formatType: null,
    planTier: null,
    isAdultProduct: null,
    hasNextInSeries: null,
    marketplaces: [],
    ...over,
  };
}

describe("backlogStats", () => {
  it("collects owned never-listened books, excluding revoked ones", () => {
    const books = [
      book({ key: "A", totalMs: 0, library: libraryItem({ asin: "A" }), bookLengthMs: 3_600_000 }),
      book({ key: "B", totalMs: 0, library: libraryItem({ asin: "B", ownership: "Revoked" }) }),
      book({ key: "C", totalMs: 100, library: libraryItem({ asin: "C" }) }),
      book({ key: "D", totalMs: 0 }),
    ];
    const stats = backlogStats(books);
    expect(stats.neverListened.map((b) => b.key)).toEqual(["A"]);
    expect(stats.backlogMs).toBe(3_600_000);
  });

  it("computes purchase→first-listen lags, median and buckets", () => {
    const purchased = Date.UTC(2024, 0, 1);
    const books = [
      book({
        key: "same-day",
        totalMs: 1,
        firstListen: d("2024-01-01"),
        library: libraryItem({ asin: "s", purchaseDate: purchased }),
      }),
      book({
        key: "ten-days",
        totalMs: 1,
        firstListen: d("2024-01-11"),
        library: libraryItem({ asin: "t", purchaseDate: purchased }),
      }),
      book({
        key: "two-years",
        totalMs: 1,
        firstListen: d("2026-01-01"),
        library: libraryItem({ asin: "u", purchaseDate: purchased }),
      }),
    ];
    const stats = backlogStats(books);
    expect(stats.lagsDays).toEqual([0, 10, 731]);
    expect(stats.medianLagDays).toBe(10);
    expect(stats.lagBuckets.find((b) => b.label === "same day")!.count).toBe(1);
    expect(stats.lagBuckets.find((b) => b.label === "≤ 1 month")!.count).toBe(1);
    expect(stats.lagBuckets.find((b) => b.label === "over a year")!.count).toBe(1);
  });

  it("handles empty input", () => {
    const stats = backlogStats([]);
    expect(stats.medianLagDays).toBeNull();
    expect(stats.neverListened).toEqual([]);
  });
});

describe("acquisitionsByMonth", () => {
  it("classifies by matching purchase type and fills month gaps", () => {
    const library = [
      libraryItem({ asin: "A", purchaseDate: Date.UTC(2024, 0, 5) }),
      libraryItem({ asin: "B", purchaseDate: Date.UTC(2024, 2, 5) }),
      libraryItem({ asin: "C", purchaseDate: Date.UTC(2024, 2, 10) }),
    ];
    const purchases: Purchase[] = [
      {
        orderPlaceDate: d("2024-01-05"),
        orderFulfillDate: null,
        orderId: "D01-1",
        status: null,
        type: "CREDIT",
        preorder: false,
        saleType: null,
        royaltySaleType: null,
        regularPrice: null,
        discount: null,
        consumedCredit: 1,
        pricePaid: 0,
        taxRate: null,
        tax: null,
        currency: "EUR",
        productName: null,
        asin: "A",
        channel: null,
      },
      {
        orderPlaceDate: d("2024-03-05"),
        orderFulfillDate: null,
        orderId: "D01-2",
        status: null,
        type: "CASH",
        preorder: false,
        saleType: null,
        royaltySaleType: null,
        regularPrice: null,
        discount: null,
        consumedCredit: 0,
        pricePaid: 9.95,
        taxRate: null,
        tax: null,
        currency: "EUR",
        productName: null,
        asin: "B",
        channel: null,
      },
    ];
    const rows = acquisitionsByMonth(library, purchases);
    expect(rows.map((r) => r.month)).toEqual(["2024-01", "2024-02", "2024-03"]);
    expect(rows[0]).toEqual({ month: "2024-01", credit: 1, cash: 0, other: 0 });
    expect(rows[1]).toEqual({ month: "2024-02", credit: 0, cash: 0, other: 0 });
    expect(rows[2]).toEqual({ month: "2024-03", credit: 0, cash: 1, other: 1 });
  });
});

function purchase(over: Partial<Purchase> & { orderPlaceDate: IsoDate; orderId: string }): Purchase {
  return {
    orderFulfillDate: null,
    status: null,
    type: "CREDIT",
    preorder: false,
    saleType: "AL",
    royaltySaleType: "AL",
    regularPrice: null,
    discount: null,
    consumedCredit: null,
    pricePaid: null,
    taxRate: null,
    tax: null,
    currency: "EUR",
    productName: null,
    asin: null,
    channel: null,
    ...over,
  };
}

describe("acquisitionByAsin", () => {
  it("prices cash orders and marks credit orders", () => {
    const prices = acquisitionByAsin([
      purchase({ orderPlaceDate: d("2024-01-05"), orderId: "D1", asin: "A", type: "CREDIT", consumedCredit: 1 }),
      // Price Paid Member empty, so the gross comes from price + tax
      purchase({
        orderPlaceDate: d("2026-08-10"),
        orderId: "D2",
        asin: "B",
        type: "CASH",
        saleType: "ALOP",
        royaltySaleType: "ALOP",
        regularPrice: 2.96,
        tax: 0.2,
        discount: 0,
        pricePaid: 0,
      }),
      // fully discounted promo: still a cash order, at zero
      purchase({ orderPlaceDate: d("2021-05-10"), orderId: "D3", asin: "C", type: "CASH", regularPrice: 19.58, tax: 0, discount: -19.58, pricePaid: 0 }),
    ]);
    expect(prices.get("A")).toEqual({ kind: "credit" });
    expect(prices.get("B")).toEqual({ kind: "cash", eur: 3.16 });
    expect(prices.get("C")).toEqual({ kind: "cash", eur: 0 });
    expect(prices.get("D")).toBeUndefined();
  });

  it("skips credit packs so their ASIN never prices a book", () => {
    const prices = acquisitionByAsin([
      purchase({
        orderPlaceDate: d("2025-09-15"),
        orderId: "D1",
        asin: "PACK",
        type: "CASH",
        saleType: "ALOP",
        royaltySaleType: "EXCLUDE",
        productName: "5 Extra Guthaben",
        pricePaid: 39.8,
      }),
    ]);
    expect(prices.has("PACK")).toBe(false);
  });

  it("keeps the earliest order when an ASIN was bought twice", () => {
    const prices = acquisitionByAsin([
      purchase({ orderPlaceDate: d("2024-01-05"), orderId: "D1", asin: "A", type: "CREDIT", consumedCredit: 1 }),
      purchase({ orderPlaceDate: d("2024-06-05"), orderId: "D2", asin: "A", type: "CASH", pricePaid: 12.5 }),
    ]);
    expect(prices.get("A")).toEqual({ kind: "credit" });
  });
});
