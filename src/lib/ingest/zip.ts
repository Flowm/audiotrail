import JSZip from "jszip";

import { TakeoutError } from "@/types/takeout";

import type { FileProvider, VirtualFile } from "./provider";

export async function zipProvider(data: ArrayBuffer | Uint8Array | Blob): Promise<FileProvider> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new TakeoutError("That file doesn't look like a readable zip archive. Drop the unmodified Audible.zip from your takeout email.");
  }

  const files: VirtualFile[] = [];
  zip.forEach((path, entry) => {
    if (entry.dir) return;
    files.push({ path, text: () => entry.async("string") });
  });

  return { list: () => Promise.resolve(files) };
}
