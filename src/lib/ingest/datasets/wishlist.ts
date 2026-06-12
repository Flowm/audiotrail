import type { WishlistItem } from '@/types/models'
import type { RawWishlistRow } from '@/types/raw'

import { parseCsv } from '../csv'
import { isoDate, sentinel } from '../normalize'

import type { DatasetDescriptor } from './descriptor'

export const wishlistDataset: DatasetDescriptor = {
  key: 'wishlist',
  label: 'Wishlist',
  match: /Audible\.Wishlist\/[^/]*\.csv$/i,

  async parse(files) {
    const warnings: string[] = []
    const wishlist: WishlistItem[] = []
    let skipped = 0

    for (const file of files) {
      const { rows, warnings: csvWarnings } = parseCsv(await file.text())
      warnings.push(...csvWarnings.map((warning) => `${file.path}: ${warning}`))
      for (const raw of rows) {
        const row = raw as RawWishlistRow
        const addDate = isoDate(row['Add Date'])
        if (addDate === null) {
          skipped += 1
          continue
        }
        wishlist.push({
          addDate,
          deleteDate: isoDate(row['Delete Date']),
          productName: sentinel(row['Product Name']),
          asin: sentinel(row.ASIN),
          status: sentinel(row.Status),
        })
      }
    }

    if (skipped > 0) warnings.push(`skipped ${skipped} row(s) without an add date`)
    wishlist.sort((a, b) => (a.addDate < b.addDate ? -1 : 1))
    return { patch: { wishlist }, rows: wishlist.length, warnings }
  },
}
