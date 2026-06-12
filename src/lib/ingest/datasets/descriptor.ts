import type { DatasetKey, TakeoutBundle } from '@/types/takeout'

import type { VirtualFile } from '../provider'

export interface DatasetParseResult {
  patch: Partial<TakeoutBundle>
  rows: number
  /** Human extra for the load report, e.g. '2 profiles'. */
  detail?: string
  warnings: string[]
}

export interface DatasetDescriptor {
  key: DatasetKey
  label: string
  /**
   * Tested against the full path of every file in the takeout. Anchored on
   * the path suffix so an optional wrapper directory never breaks discovery.
   */
  match: RegExp
  parse(files: VirtualFile[]): Promise<DatasetParseResult>
}
