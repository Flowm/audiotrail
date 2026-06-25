import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { strFromU8, unzipSync } from "fflate";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";

import { ingestTakeout } from "@/lib/ingest";
import { zipProvider } from "@/lib/ingest/zip";

/**
 * Smoke test against the developer's own gitignored sample takeouts. Runs once
 * per *.zip found in data/, so a freshly dropped export (old or 2026 layout) is
 * covered automatically; skipped where no sample exists (CI, fresh clones).
 * Assertions compare two independent computation paths — no real values are
 * hardcoded, and the second pass is header-based so it holds for either layout.
 */
const dataDir = fileURLToPath(new URL("../../data/", import.meta.url));
const samples = existsSync(dataDir)
  ? readdirSync(dataDir)
      .filter((name) => name.toLowerCase().endsWith(".zip"))
      .toSorted()
  : [];

// Local mirrors of lib/ingest/normalize, kept independent on purpose so the
// checks are a second implementation rather than a re-import of the parser.
const SENTINELS = new Set(["", "Not Available", "Not Applicable", "UNKNOWN", "Empty"]);
const norm = (value: string | undefined): string | null => {
  const trimmed = (value ?? "").trim();
  return SENTINELS.has(trimmed) ? null : trimmed;
};
const num = (value: string | undefined): number | null => {
  const raw = norm(value);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};
const iso = (value: string | undefined): string | null => {
  const raw = norm(value);
  const day = raw?.slice(0, 10) ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
};
// Maps 2026 'Title Case' headers onto the snake_case the parser reads.
const titleToSnake = (header: string): string => (header === "ASIN" ? "ASIN" : header.toLowerCase().replace(/ /g, "_"));
const PART_SUFFIX_RE = /\s+Part \d+$/i;
const PROFILE_RE = /Audible\.Listening\/([^/]+)\/[^/]*\.csv$/i;

describe.skipIf(samples.length === 0)("real takeout smoke (local samples only)", () => {
  it.each(samples)("%s parses consistently with an independent pass", async (name) => {
    const data = new Uint8Array(readFileSync(join(dataDir, name)));
    const { bundle, report } = await ingestTakeout(await zipProvider(data));
    const entries = unzipSync(data);

    const statusOf = (key: string) => report.datasets.find((dataset) => dataset.key === key)!;
    const readRows = async (paths: string[], normalizeHeader?: (header: string) => string): Promise<Record<string, string>[]> => {
      const out: Record<string, string>[] = [];
      for (const path of paths) {
        const text = strFromU8(entries[path]!).replace(/^﻿/, "");
        const parsed = Papa.parse<Record<string, string>>(text, {
          header: true,
          skipEmptyLines: "greedy",
          transformHeader: (header) => (normalizeHeader ?? ((h: string) => h.trim()))(header.trim()),
        });
        out.push(...parsed.data);
      }
      return out;
    };

    // A complete profile takeout exercises every dataset — none missing or errored.
    for (const dataset of report.datasets) {
      expect(dataset.status, `${name}: ${dataset.key} (${dataset.error ?? ""})`).toBe("loaded");
    }

    // Listening: replay the parser's skip + multipart-echo dedup over a fresh
    // header-based pass and confirm row count and total duration agree.
    const seen = new Set<string>();
    let rawRows = 0;
    let dedupedRows = 0;
    let dedupedDurationSum = 0;
    for (const path of statusOf("listening").files) {
      const profile = PROFILE_RE.exec(path)?.[1] ?? "Unknown profile";
      const rows = await readRows([path]);
      for (const row of rows) {
        rawRows += 1;
        const startDate = iso(row["Start Date"]);
        const durationMs = num(row["Event Duration Milliseconds"]);
        const productName = norm(row["Product Name"]);
        if (startDate === null || durationMs === null || productName === null) continue;
        const asin = norm(row.ASIN);
        const subject = asin ?? `n:${productName.replace(PART_SUFFIX_RE, "").toLowerCase()}`;
        const key = [
          profile,
          subject,
          startDate,
          iso(row["End Date"]),
          num(row["Start Position Milliseconds"]),
          num(row["End Position Milliseconds"]),
          durationMs,
          num(row["Book Length Milliseconds"]),
          norm(row["Delivery Type"]),
          norm(row["Audio Type"]),
          norm(row["Listening Mode"]),
        ].join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        dedupedRows += 1;
        dedupedDurationSum += durationMs;
      }
    }

    expect(rawRows).toBeGreaterThan(dedupedRows);
    expect(bundle.listening).toHaveLength(dedupedRows);
    expect(bundle.listening.reduce((sum, session) => sum + session.durationMs, 0)).toBe(dedupedDurationSum);
    expect(bundle.profiles.length).toBeGreaterThanOrEqual(1);

    // Datasets that keep exactly one row per CSV row: bundle length must equal
    // an independent raw row count over the very files the dataset matched.
    for (const key of ["cart", "returns", "devices", "impressions", "membershipEvents", "searchSessions", "searchHits"] as const) {
      const raw = await readRows(statusOf(key).files);
      expect(bundle[key], `${name}: ${key}`).toHaveLength(raw.length);
    }

    // Collections carry two row kinds and are deduplicated by identity across
    // files — count distinct identities independently (header-naming-agnostic).
    const collectionIdentities = new Set<string>();
    for (const row of await readRows(statusOf("collections").files, titleToSnake)) {
      const id = norm(row.collection_id);
      if (id === null) continue;
      collectionIdentities.add([id, norm(row.ASIN), row.title_added_date, row.collection_creation_date].join("|"));
    }
    expect(bundle.collections.length + bundle.collectionItems.length).toBe(collectionIdentities.size);

    // Merged library is keyed by unique ASIN.
    expect(new Set(bundle.library.map((item) => item.asin)).size).toBe(bundle.library.length);
    expect(bundle.library.length).toBeGreaterThan(0);

    console.log(
      "[smoke]",
      JSON.stringify({
        sample: name,
        rawRows,
        keptSessions: bundle.listening.length,
        echoDuplicates: rawRows - dedupedRows,
        profiles: bundle.profiles,
        libraryTitles: bundle.library.length,
        totalListeningHours: Math.round((bundle.listening.reduce((sum, s) => sum + s.durationMs, 0) / 3.6e6) * 10) / 10,
        purchases: bundle.purchases.length,
        credits: bundle.credits.length,
        billings: bundle.billings.length,
        collections: bundle.collections.length,
        collectionItems: bundle.collectionItems.length,
        playback: bundle.playback.length,
        account: bundle.account.map((a) => a.marketplace),
        recognized: report.recognizedFileCount,
        ignored: report.ignoredPaths.length,
        parseMs: report.durationMs,
      }),
    );
  });
});
