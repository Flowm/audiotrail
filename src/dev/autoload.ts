import type { useTakeoutStore } from '@/stores/takeout'

/**
 * DEV-only sample loader. The matching Vite middleware (see vite.config.ts)
 * exists only under `vite serve`, and every call site is guarded by
 * `import.meta.env.DEV`, so neither this module nor the sample URL can reach
 * a production build.
 */
export const SAMPLE_URL = '/__sample/Audible.zip'

export async function loadDevSample(
  takeout: ReturnType<typeof useTakeoutStore>,
): Promise<void> {
  if (!import.meta.env.DEV) return
  await takeout.loadFromUrl(SAMPLE_URL, 'Audible.zip (local sample)')
}
