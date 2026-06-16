import type { ListeningSession } from "@/types/models";
import type { RawListeningRow } from "@/types/raw";

import { parseCsv } from "../csv";
import { isoDate, num, sentinel } from "../normalize";
import type { DatasetDescriptor } from "./descriptor";

const PROFILE_RE = /Audible\.Listening\/([^/]+)\/[^/]*\.csv$/i;

/**
 * Multipart books replicate every session once per part: same ASIN, dates,
 * positions and duration — only the product name differs by a ' Part N'
 * suffix. Sessions sharing this identity are one real listening event.
 */
const PART_SUFFIX_RE = /\s+Part \d+$/i;

function identityKey(profile: string, session: Omit<ListeningSession, "profile">): string {
  const subject = session.asin ?? `n:${session.productName.replace(PART_SUFFIX_RE, "").toLowerCase()}`;
  return [
    profile,
    subject,
    session.startDate,
    session.endDate,
    session.startPositionMs,
    session.endPositionMs,
    session.durationMs,
    session.bookLengthMs,
    session.deliveryType,
    session.audioType,
    session.listeningMode,
  ].join("|");
}

export const listeningDataset: DatasetDescriptor = {
  key: "listening",
  label: "Listening history",
  // Old: one Listening.csv per profile folder. New (2026): a single
  // consolidated 'Listening History.csv' with no per-profile split.
  match: /Audible\.Listening\/[^/]+\/[^/]*\.csv$|Library & Listening\/Listening History\.csv$/i,

  async parse(files) {
    const sessions: ListeningSession[] = [];
    const warnings: string[] = [];
    const rowsPerProfile = new Map<string, number>();
    const seen = new Map<string, ListeningSession>();
    let duplicates = 0;

    for (const file of files) {
      const profile = PROFILE_RE.exec(file.path)?.[1] ?? "Unknown profile";
      const { rows, warnings: csvWarnings } = parseCsv(await file.text());
      warnings.push(...csvWarnings.map((warning) => `${file.path}: ${warning}`));

      let skipped = 0;
      for (const raw of rows) {
        const row = raw as RawListeningRow;
        const startDate = isoDate(row["Start Date"]);
        const durationMs = num(row["Event Duration Milliseconds"]);
        const productName = sentinel(row["Product Name"]);
        if (startDate === null || durationMs === null || productName === null) {
          skipped += 1;
          continue;
        }

        const speed = num(row["Narration Speed"]);
        const session: ListeningSession = {
          profile,
          startDate,
          endDate: isoDate(row["End Date"]),
          durationMs,
          startPositionMs: num(row["Start Position Milliseconds"]),
          endPositionMs: num(row["End Position Milliseconds"]),
          productName,
          asin: sentinel(row.ASIN),
          bookLengthMs: num(row["Book Length Milliseconds"]),
          deliveryType: sentinel(row["Delivery Type"]),
          narrationSpeed: speed !== null && speed > 0 ? speed : null,
          audioType: sentinel(row["Audio Type"]),
          listeningMode: sentinel(row["Listening Mode"]),
          appVersion: sentinel(row["App Version"]),
          timezone: sentinel(row["Local Timezone"]),
        };

        const key = identityKey(profile, session);
        const existing = seen.get(key);
        if (existing) {
          duplicates += 1;
          // Keep the shortest name — the base title without the part suffix.
          if (session.productName.length < existing.productName.length) {
            existing.productName = session.productName;
          }
          continue;
        }
        seen.set(key, session);
        sessions.push(session);
        rowsPerProfile.set(profile, (rowsPerProfile.get(profile) ?? 0) + 1);
      }
      if (skipped > 0) {
        warnings.push(`${file.path}: skipped ${skipped} incomplete row(s)`);
      }
    }

    sessions.sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));
    const profiles = [...rowsPerProfile.entries()].toSorted((a, b) => b[1] - a[1]).map(([profile]) => profile);

    const detailParts = [`${profiles.length} profile${profiles.length === 1 ? "" : "s"}`];
    if (duplicates > 0) detailParts.push(`${duplicates} multipart echo rows dropped`);

    return {
      patch: { listening: sessions, profiles },
      rows: sessions.length,
      detail: detailParts.join(" · "),
      warnings,
    };
  },
};
