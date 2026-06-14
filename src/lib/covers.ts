/**
 * Cover art helpers. Placeholders are deterministic (a hash of the ASIN/title
 * drives the hue) so the same book always gets the same color — no network.
 *
 * Real covers are strictly opt-in. Audible artwork is keyed by an internal
 * image id that can't be derived from the ASIN, and Amazon's own lookup API
 * isn't CORS-accessible from a static page, so we resolve the cover URL
 * through Audnexus (a community Audible-metadata API that is CORS-enabled).
 * Enabling covers therefore sends ASINs to Audnexus and then loads the image
 * from Amazon's CDN — see the privacy note next to the toggle.
 */

/** FNV-1a hash → stable hue in [0, 360). */
export function coverHue(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 360;
}

const STOP_WORDS = new Set(["the", "a", "an", "and", "of", "der", "die", "das", "ein", "eine", "und", "von"]);

export function titleInitials(title: string): string {
  const words = title
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((word) => word.length > 0);
  const significant = words.filter((word) => !STOP_WORDS.has(word.toLowerCase()));
  const picked = (significant.length > 0 ? significant : words).slice(0, 2);
  return picked.map((word) => word[0]!.toUpperCase()).join("") || "?";
}

// Audnexus marketplaces, mapped from the takeout's country / marketplace.
const REGION_BY_COUNTRY: Record<string, string> = {
  DE: "de",
  AT: "de",
  CH: "de",
  US: "us",
  GB: "uk",
  UK: "uk",
  IE: "uk",
  CA: "ca",
  AU: "au",
  NZ: "au",
  FR: "fr",
  BE: "fr",
  IT: "it",
  ES: "es",
  IN: "in",
  JP: "jp",
};

/** Picks the Audnexus region for the account; falls back to 'us'. */
export function audnexusRegion(countryCode: string | null | undefined, marketplace: string | null | undefined): string {
  if (countryCode) {
    const region = REGION_BY_COUNTRY[countryCode.toUpperCase()];
    if (region) return region;
  }
  if (marketplace) {
    const m = marketplace.toLowerCase();
    if (m.includes(".co.uk")) return "uk";
    if (m.includes(".co.jp")) return "jp";
    if (m.includes(".com.au")) return "au";
    if (m.endsWith(".de")) return "de";
    if (m.endsWith(".fr")) return "fr";
    if (m.endsWith(".it")) return "it";
    if (m.endsWith(".es")) return "es";
    if (m.endsWith(".in")) return "in";
    if (m.endsWith(".ca")) return "ca";
    if (m.endsWith(".com")) return "us";
  }
  return "us";
}

// Session-only cache of in-flight/resolved lookups, keyed by region:asin, so a
// book that appears in several places is fetched once. Nothing is persisted.
const cache = new Map<string, Promise<string | null>>();

interface AudnexusBook {
  image?: string;
}

async function resolveCover(asin: string, region: string): Promise<string | null> {
  const url = `https://api.audnex.us/books/${encodeURIComponent(asin)}?region=${encodeURIComponent(region)}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = (await response.json()) as AudnexusBook;
  return typeof data.image === "string" && data.image.length > 0 ? data.image : null;
}

/** Opt-in: resolves an ASIN to a cover image URL via Audnexus, or null. */
export function fetchCoverUrl(asin: string, region: string): Promise<string | null> {
  const key = `${region}:${asin}`;
  const existing = cache.get(key);
  if (existing) return existing;
  const pending = resolveCover(asin, region).catch(() => null);
  cache.set(key, pending);
  return pending;
}
