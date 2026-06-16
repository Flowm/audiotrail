import type { PlaybackEvent } from "@/types/models";
import type { RawPlaybackRow } from "@/types/raw";

import { parseCsv } from "../csv";
import { epochMs, int, sentinel } from "../normalize";
import type { DatasetDescriptor } from "./descriptor";

/** Client telemetry covering only a recent ~4-week window — label honestly. */
export const playbackDataset: DatasetDescriptor = {
  key: "playback",
  label: "Playback metrics",
  match: /Audible\.PlaybackMetrics\/.*\.csv$/i,

  async parse(files) {
    const warnings: string[] = [];
    const playback: PlaybackEvent[] = [];
    let skipped = 0;

    for (const file of files) {
      const { rows, warnings: csvWarnings } = parseCsv(await file.text());
      warnings.push(...csvWarnings.map((warning) => `${file.path}: ${warning}`));
      for (const raw of rows) {
        const row = raw as RawPlaybackRow;
        // 'Time' in older exports; renamed to 'Creation Date' in the 2026 export.
        const time = epochMs(row.Time ?? row["Creation Date"]);
        if (time === null) {
          skipped += 1;
          continue;
        }
        playback.push({
          time,
          sequence: int(row.Sequence),
          activityType: sentinel(row["Activity Type"]),
          audioOutput: sentinel(row["Audio Output Method"]),
          playbackState: sentinel(row["Playback State"]),
          consumptionMethod: sentinel(row["Consumption Method"]),
          asin: sentinel(row.ASIN),
          appVersion: sentinel(row["App Version"]),
          os: sentinel(row["Operating System"]),
        });
      }
    }

    if (skipped > 0) warnings.push(`skipped ${skipped} row(s) without a timestamp`);
    playback.sort((a, b) => a.time - b.time);

    const detail =
      playback.length > 0
        ? `${new Date(playback[0]!.time).toISOString().slice(0, 10)} … ${new Date(playback[playback.length - 1]!.time).toISOString().slice(0, 10)} (recent sample only)`
        : undefined;

    return { patch: { playback }, rows: playback.length, detail, warnings };
  },
};
