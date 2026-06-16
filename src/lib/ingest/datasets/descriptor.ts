import type { DatasetKey, TakeoutBundle } from "@/types/takeout";

import type { VirtualFile } from "../provider";

export interface DatasetParseResult {
  patch: Partial<TakeoutBundle>;
  rows: number;
  /** Human extra for the load report, e.g. '2 profiles'. */
  detail?: string;
  warnings: string[];
}

export interface DatasetDescriptor {
  key: DatasetKey;
  label: string;
  /**
   * Path shapes that identify this dataset — a file matches if it matches any
   * of them. Anchored on the path suffix so an optional wrapper directory never
   * breaks discovery; one entry per export layout the dataset is known to ship in.
   */
  match: RegExp[];
  parse(files: VirtualFile[]): Promise<DatasetParseResult>;
}
