/**
 * Source-agnostic file access seam. Today only a zip provider exists; a
 * directory-drop provider can slot in later without touching dataset code.
 */
export interface VirtualFile {
  /** Path inside the takeout, '/'-separated, no leading slash. */
  path: string;
  text(): Promise<string>;
}

export interface FileProvider {
  /** All regular files in the takeout (directories excluded). */
  list(): Promise<VirtualFile[]>;
}
