import { describe, expect, it } from "vitest";

import type { RawLibraryRow } from "@/types/raw";

import type { VirtualFile } from "../provider";
import { libraryDataset, mergeLibraryRows, parseSeriesInfo } from "./library";

const vf = (path: string, content: string): VirtualFile => ({
  path,
  text: () => Promise.resolve(content),
});

describe("parseSeriesInfo", () => {
  it("parses asin and title", () => {
    expect(parseSeriesInfo("asin:B09GXD7NNN,title:The Ripple System")).toEqual([{ asin: "B09GXD7NNN", title: "The Ripple System" }]);
  });

  it("parses multi-series memberships (saga + universe)", () => {
    expect(parseSeriesInfo("asin:B071HGJBN6,title:The Stormlight Archive,asin:B0DMXT9PD3,title:The Cosmere")).toEqual([
      { asin: "B071HGJBN6", title: "The Stormlight Archive" },
      { asin: "B0DMXT9PD3", title: "The Cosmere" },
    ]);
  });

  it("keeps commas inside the title", () => {
    expect(parseSeriesInfo("asin:B09X,title:Foo, Bar")[0]?.title).toBe("Foo, Bar");
  });

  it("returns empty for sentinels and malformed values", () => {
    expect(parseSeriesInfo("Not Available")).toEqual([]);
    expect(parseSeriesInfo("just a string")).toEqual([]);
  });
});

describe("mergeLibraryRows", () => {
  const rows: RawLibraryRow[] = [
    {
      ASIN: "B0AAA",
      title: "Alpha",
      last_updated: "2024-01-01T00:00:00Z",
      authors: "A One,A Two",
      marketplace: "www.audible.de",
      is_finished: "No",
      purchase_date: "2023-05-01T00:00:00Z",
      length_in_minutes: "Not Available",
      language: "en",
    },
    {
      ASIN: "B0AAA",
      title: "Alpha",
      last_updated: "2024-06-01T00:00:00Z",
      marketplace: "www.audible.com",
      is_finished: "Yes",
      purchase_date: "2023-04-01T00:00:00Z",
      length_in_minutes: "988",
      book_series_info: "asin:B09SER,title:The Series",
    },
    { ASIN: "B0AAA", marketplace: "www.audible.de" },
    { title: "row without asin" },
    { ASIN: "B0BBB", title: "Beta", audiobook_narrator: "Travis Baldree" },
  ];

  it("merges by ASIN with newest-first non-null preference", () => {
    const { items, skipped } = mergeLibraryRows(rows);
    expect(skipped).toBe(1);
    expect(items.map((i) => i.asin)).toEqual(["B0AAA", "B0BBB"]);

    const alpha = items[0]!;
    expect(alpha.lengthMinutes).toBe(988);
    expect(alpha.language).toBe("en");
    expect(alpha.authors).toEqual(["A One", "A Two"]);
    expect(alpha.series).toEqual([{ asin: "B09SER", title: "The Series" }]);
  });

  it("unions marketplaces, takes earliest purchase date and yes-wins finished", () => {
    const { items } = mergeLibraryRows(rows);
    const alpha = items[0]!;
    // union follows the merged (newest last_updated first) row order
    expect(alpha.marketplaces).toEqual(["www.audible.com", "www.audible.de"]);
    expect(alpha.purchaseDate).toBe(Date.UTC(2023, 3, 1));
    expect(alpha.isFinished).toBe(true);
  });

  it("leaves unknown fields null", () => {
    const { items } = mergeLibraryRows(rows);
    const beta = items[1]!;
    expect(beta.narrators).toEqual(["Travis Baldree"]);
    expect(beta.isFinished).toBeNull();
    expect(beta.purchaseDate).toBeNull();
    expect(beta.series).toEqual([]);
  });
});

describe("libraryDataset", () => {
  it("matches the marketplace variants and the 2026 single file", () => {
    const matches = (path: string): boolean => libraryDataset.match.some((pattern) => pattern.test(path));
    for (const name of ["Library", "Library_DUB", "Library_ZAZ"]) {
      expect(matches(`Audible.AudibleLibraryItemFactoryService/datasets/${name}/${name}.csv`)).toBe(true);
    }
    expect(matches("Your Audible Library & Listening/Library.csv")).toBe(true);
  });

  it("parses CSV files and reports merge detail", async () => {
    const csv = '﻿ASIN,title,authors,marketplace\nB0AAA,Alpha,"Ann Author",www.audible.de\n';
    const csv2 = '﻿ASIN,title,authors,marketplace\nB0AAA,Alpha,"Ann Author",www.audible.com\n';
    const result = await libraryDataset.parse([
      vf("Audible.AudibleLibraryItemFactoryService/datasets/Library/Library.csv", csv),
      vf("Audible.AudibleLibraryItemFactoryService/datasets/Library_DUB/Library_DUB.csv", csv2),
    ]);
    expect(result.rows).toBe(1);
    expect(result.detail).toContain("2 rows across 2 file(s)");
    expect(result.patch.library![0]!.marketplaces).toHaveLength(2);
  });

  it("reads 2026 Title Case headers via the titleToSnake bridge", async () => {
    const csv = '﻿ASIN,Title,Authors,Marketplace,Length in Minutes,Is Finished\nB0AAA,Alpha,"Ann Author",www.audible.de,826,Yes\n';
    const result = await libraryDataset.parse([vf("Your Audible Library & Listening/Library.csv", csv)]);
    expect(result.rows).toBe(1);
    const item = result.patch.library![0]!;
    expect(item.title).toBe("Alpha");
    expect(item.authors).toEqual(["Ann Author"]);
    expect(item.lengthMinutes).toBe(826);
    expect(item.isFinished).toBe(true);
  });
});
