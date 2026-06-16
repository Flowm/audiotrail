import { emptyBundle, TakeoutError, type DatasetStatus, type IngestProgress, type LoadReport, type TakeoutBundle } from "@/types/takeout";

import { DATASETS } from "./datasets";
import type { FileProvider } from "./provider";

export interface IngestResult {
  bundle: TakeoutBundle;
  report: LoadReport;
}

/** Lets the UI paint progress between datasets during a synchronous parse. */
const breathe = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Parses everything recognizable. Missing datasets are recorded, not fatal;
 * the only hard error is a takeout with zero recognizable files.
 */
export async function ingestTakeout(provider: FileProvider, onProgress?: (progress: IngestProgress) => void): Promise<IngestResult> {
  const started = performance.now();
  onProgress?.({ stage: "unzip", datasetLabel: null, index: 0, total: DATASETS.length });
  const files = await provider.list();

  const bundle = emptyBundle();
  const statuses: DatasetStatus[] = [];
  const recognized = new Set<string>();

  for (const [index, dataset] of DATASETS.entries()) {
    onProgress?.({
      stage: "parse",
      datasetLabel: dataset.label,
      index,
      total: DATASETS.length,
    });
    await breathe();

    const matched = files.filter((file) => dataset.match.some((pattern) => pattern.test(file.path)));
    if (matched.length === 0) {
      statuses.push({
        key: dataset.key,
        label: dataset.label,
        status: "missing",
        rows: 0,
        detail: null,
        files: [],
        warnings: [],
        error: null,
      });
      continue;
    }

    for (const file of matched) recognized.add(file.path);
    try {
      const result = await dataset.parse(matched);
      Object.assign(bundle, result.patch);
      statuses.push({
        key: dataset.key,
        label: dataset.label,
        status: "loaded",
        rows: result.rows,
        detail: result.detail ?? null,
        files: matched.map((file) => file.path),
        warnings: result.warnings,
        error: null,
      });
    } catch (cause) {
      statuses.push({
        key: dataset.key,
        label: dataset.label,
        status: "error",
        rows: 0,
        detail: null,
        files: matched.map((file) => file.path),
        warnings: [],
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }

  if (recognized.size === 0) {
    throw new TakeoutError("No recognizable Audible files in this zip. Make sure you drop the Audible takeout itself, not a different export.");
  }

  const report: LoadReport = {
    generatedAt: Date.now(),
    durationMs: Math.round(performance.now() - started),
    entryCount: files.length,
    recognizedFileCount: recognized.size,
    ignoredPaths: files
      .map((file) => file.path)
      .filter((path) => !recognized.has(path))
      .toSorted(),
    datasets: statuses,
  };

  return { bundle, report };
}
