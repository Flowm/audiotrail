import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import JSZip from "jszip";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";

import { ingestTakeout } from "@/lib/ingest";
import { zipProvider } from "@/lib/ingest/zip";

/**
 * Smoke test against the developer's own gitignored sample takeout. Skipped
 * everywhere the sample doesn't exist (CI, fresh clones). Assertions compare
 * two independent computation paths — no real values are hardcoded here.
 */
const zipPath = fileURLToPath(new URL("../../data/Audible.zip", import.meta.url));

describe.skipIf(!existsSync(zipPath))("real takeout smoke (local sample only)", () => {
  it("matches an independent raw pass over the listening CSVs", async () => {
    const data = new Uint8Array(readFileSync(zipPath));
    const { bundle, report } = await ingestTakeout(await zipProvider(data));

    const zip = await JSZip.loadAsync(data);
    const listeningPaths = Object.keys(zip.files).filter((path) => /Audible\.Listening\/[^/]+\/Listening\.csv$/.test(path));

    // Independent pass: parse positionally and deduplicate multipart echo
    // rows (identical identity tuple, name differing only by ' Part N').
    const seen = new Set<string>();
    let rawRows = 0;
    let dedupedRows = 0;
    let dedupedDurationSum = 0;
    for (const path of listeningPaths) {
      const profile = path.split("/").at(-2) ?? "?";
      const text = (await zip.file(path)!.async("string")).replace(/^﻿/, "");
      const parsed = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
      for (const row of parsed.data.slice(1)) {
        rawRows += 1;
        const asin = row[6] && row[6] !== "Not Available" ? row[6] : null;
        const subject = asin ?? `n:${(row[5] ?? "").replace(/\s+Part \d+$/i, "").toLowerCase()}`;
        const key = [profile, subject, row[0], row[1], row[3], row[4], row[2], row[7], row[8], row[11], row[13]].join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        dedupedRows += 1;
        dedupedDurationSum += Number(row[2]) || 0;
      }
    }

    expect(rawRows).toBeGreaterThan(dedupedRows);
    expect(bundle.profiles).toHaveLength(listeningPaths.length);
    expect(bundle.listening).toHaveLength(dedupedRows);
    expect(bundle.listening.reduce((sum, s) => sum + s.durationMs, 0)).toBe(dedupedDurationSum);

    const statusOf = (key: string) => report.datasets.find((d) => d.key === key)!;
    expect(statusOf("listening").status).toBe("loaded");
    expect(statusOf("library").status).toBe("loaded");
    expect(statusOf("account").status).toBe("loaded");

    // 1:1 CSV datasets: bundle length must equal an independent raw row count
    const countRows = async (pathRe: RegExp): Promise<number> => {
      let count = 0;
      for (const path of Object.keys(zip.files).filter((p) => pathRe.test(p) && !zip.files[p]!.dir)) {
        const text = (await zip.file(path)!.async("string")).replace(/^﻿/, "");
        count += Papa.parse<string[]>(text, { skipEmptyLines: "greedy" }).data.length - 1;
      }
      return count;
    };

    expect(bundle.purchases).toHaveLength(await countRows(/Audible\.PurchaseHistory\/.*\.csv$/));
    expect(bundle.credits).toHaveLength(await countRows(/Audible\.Credits\/.*\.csv$/));
    expect(bundle.billings).toHaveLength(await countRows(/Audible\.MembershipBillings\/.*\.csv$/));
    expect(bundle.wishlist).toHaveLength(await countRows(/Audible\.Wishlist\/.*\.csv$/));
    expect(bundle.cart).toHaveLength(await countRows(/Audible\.CartHistory\/.*\.csv$/));
    expect(bundle.returns).toHaveLength(await countRows(/Audible\.ContentReturn\/.*\.csv$/));
    expect(bundle.devices).toHaveLength(await countRows(/Audible\.DeviceActivation\/.*\.csv$/));
    expect(bundle.searchSessions).toHaveLength(await countRows(/SearchData_Tommy_Group\/.*\.csv$/));
    expect(bundle.searchHits).toHaveLength(await countRows(/SearchData_Tommy_ASIN\/.*\.csv$/));
    expect(bundle.playback).toHaveLength(await countRows(/Audible\.PlaybackMetrics\/.*\.csv$/));

    // two byte-identical collections files → exactly half the raw rows survive
    const collectionsRaw = await countRows(/Collections[^/]*\/.*\.csv$/);
    expect(bundle.collections.length + bundle.collectionItems.length).toBe(collectionsRaw / 2);

    // merged library has unique ASINs
    expect(new Set(bundle.library.map((item) => item.asin)).size).toBe(bundle.library.length);
    expect(bundle.library.length).toBeGreaterThan(0);

    console.log(
      "[smoke]",
      JSON.stringify({
        rawRows,
        keptSessions: bundle.listening.length,
        echoDuplicates: rawRows - dedupedRows,
        profiles: bundle.profiles.length,
        libraryTitles: bundle.library.length,
        totalListeningHours: Math.round((bundle.listening.reduce((sum, s) => sum + s.durationMs, 0) / 3.6e6) * 10) / 10,
        purchases: bundle.purchases.length,
        credits: bundle.credits.length,
        billings: bundle.billings.length,
        wishlist: bundle.wishlist.length,
        collections: bundle.collections.length,
        collectionItems: bundle.collectionItems.length,
        searchSessions: bundle.searchSessions.length,
        searchHits: bundle.searchHits.length,
        playback: bundle.playback.length,
        cart: bundle.cart.length,
        returns: bundle.returns.length,
        devices: bundle.devices.length,
        impressions: bundle.impressions.length,
        membershipEvents: bundle.membershipEvents.length,
        parseMs: report.durationMs,
      }),
    );
  });
});
