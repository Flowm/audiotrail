/**
 * Cover art helpers. Placeholders are deterministic (hash of the ASIN/title
 * drives the hue) so the same book always gets the same color — no network.
 * Real covers come from Amazon's public image CDN and are strictly opt-in.
 */

/** FNV-1a hash → stable hue in [0, 360). */
export function coverHue(key: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) % 360
}

/** Opt-in only: requesting this URL reveals the ASIN to Amazon. */
export function coverUrl(asin: string): string {
  return `https://m.media-amazon.com/images/P/${asin}.jpg`
}

const STOP_WORDS = new Set(['the', 'a', 'an', 'and', 'of', 'der', 'die', 'das', 'ein', 'eine', 'und', 'von'])

export function titleInitials(title: string): string {
  const words = title
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter((word) => word.length > 0)
  const significant = words.filter((word) => !STOP_WORDS.has(word.toLowerCase()))
  const picked = (significant.length > 0 ? significant : words).slice(0, 2)
  return picked.map((word) => word[0]!.toUpperCase()).join('') || '?'
}
