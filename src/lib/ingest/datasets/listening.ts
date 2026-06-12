import type { ListeningSession } from '@/types/models'
import type { RawListeningRow } from '@/types/raw'

import { parseCsv } from '../csv'
import { isoDate, num, sentinel } from '../normalize'

import type { DatasetDescriptor } from './descriptor'

const PROFILE_RE = /Audible\.Listening\/([^/]+)\/[^/]*\.csv$/i

export const listeningDataset: DatasetDescriptor = {
  key: 'listening',
  label: 'Listening history',
  match: /Audible\.Listening\/[^/]+\/[^/]*\.csv$/i,

  async parse(files) {
    const sessions: ListeningSession[] = []
    const warnings: string[] = []
    const rowsPerProfile = new Map<string, number>()

    for (const file of files) {
      const profile = PROFILE_RE.exec(file.path)?.[1] ?? 'Unknown profile'
      const { rows, warnings: csvWarnings } = parseCsv(await file.text())
      warnings.push(...csvWarnings.map((warning) => `${file.path}: ${warning}`))

      let skipped = 0
      for (const raw of rows) {
        const row = raw as RawListeningRow
        const startDate = isoDate(row['Start Date'])
        const durationMs = num(row['Event Duration Milliseconds'])
        const productName = sentinel(row['Product Name'])
        if (startDate === null || durationMs === null || productName === null) {
          skipped += 1
          continue
        }

        const speed = num(row['Narration Speed'])
        sessions.push({
          profile,
          startDate,
          endDate: isoDate(row['End Date']),
          durationMs,
          startPositionMs: num(row['Start Position Milliseconds']),
          endPositionMs: num(row['End Position Milliseconds']),
          productName,
          asin: sentinel(row.ASIN),
          bookLengthMs: num(row['Book Length Milliseconds']),
          deliveryType: sentinel(row['Delivery Type']),
          narrationSpeed: speed !== null && speed > 0 ? speed : null,
          audioType: sentinel(row['Audio Type']),
          listeningMode: sentinel(row['Listening Mode']),
          appVersion: sentinel(row['App Version']),
          timezone: sentinel(row['Local Timezone']),
        })
        rowsPerProfile.set(profile, (rowsPerProfile.get(profile) ?? 0) + 1)
      }
      if (skipped > 0) {
        warnings.push(`${file.path}: skipped ${skipped} incomplete row(s)`)
      }
    }

    sessions.sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0))
    const profiles = [...rowsPerProfile.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([profile]) => profile)

    return {
      patch: { listening: sessions, profiles },
      rows: sessions.length,
      detail: `${profiles.length} profile${profiles.length === 1 ? '' : 's'}`,
      warnings,
    }
  },
}
