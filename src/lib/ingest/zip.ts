import { strFromU8, unzipSync } from "fflate";

import { TakeoutError } from "@/types/takeout";

import type { FileProvider, VirtualFile } from "./provider";

export async function zipProvider(data: ArrayBuffer | Uint8Array | Blob): Promise<FileProvider> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data instanceof Blob ? await data.arrayBuffer() : data);

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch {
    throw new TakeoutError("That file doesn't look like a readable zip archive. Drop the unmodified Audible.zip from your takeout email.");
  }

  // fflate lists directory entries with a trailing slash; skip them so only regular files surface.
  const files: VirtualFile[] = Object.entries(entries)
    .filter(([path]) => !path.endsWith("/"))
    .map(([path, content]) => ({ path, text: () => Promise.resolve(strFromU8(content)) }));

  return { list: () => Promise.resolve(files) };
}
