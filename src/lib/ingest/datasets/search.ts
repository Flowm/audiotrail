import type { SearchHit, SearchSession } from '@/types/models'
import type { RawSearchHitRow, RawSearchSessionRow } from '@/types/raw'

import { parseCsv } from '../csv'
import { epochMs, int, isoDate, sentinel, yesNo } from '../normalize'

import type { DatasetDescriptor } from './descriptor'

export const searchSessionsDataset: DatasetDescriptor = {
  key: 'searchSessions',
  label: 'Search sessions',
  match: /SearchData_Tommy_Group\/[^/]*\.csv$/i,

  async parse(files) {
    const warnings: string[] = []
    const searchSessions: SearchSession[] = []

    for (const file of files) {
      const { rows, warnings: csvWarnings } = parseCsv(await file.text())
      warnings.push(...csvWarnings.map((warning) => `${file.path}: ${warning}`))
      for (const raw of rows) {
        const row = raw as RawSearchSessionRow
        searchSessions.push({
          keywords: sentinel(row.keywords),
          date: isoDate(row.partition_date),
          firstSearchAt: epochMs(row.first_search_gmt_time),
          lastSearchAt: epochMs(row.last_search_gmt_time),
          searchCount: int(row.search_count) ?? 0,
          clickCount: int(row.click_count) ?? 0,
          addCount: int(row.add_count) ?? 0,
          orderCount: int(row.order_count) ?? 0,
          consumeCount: int(row.consume_count) ?? 0,
          abandonments: int(row.abandonments) ?? 0,
          paidPurchases: int(row.paid_purchased) ?? 0,
          clicked: yesNo(row.clicked),
          added: yesNo(row.added),
          maxTotalFound: int(row.max_total_found),
          searchType: sentinel(row.search_type),
          os: sentinel(row.operating_system_name),
          siteVariant: sentinel(row.site_variant),
          queryLength: int(row.query_length),
          spellingCorrection: sentinel(row.spelling_correction),
          firstClickedAsin: sentinel(row.first_clicked_asin),
          firstClickedName: sentinel(row.first_clicked_product_name),
          firstPurchasedAsin: sentinel(row.first_purchased_asin),
          firstPurchasedName: sentinel(row.first_purchase_product_name),
        })
      }
    }

    searchSessions.sort((a, b) => (a.firstSearchAt ?? 0) - (b.firstSearchAt ?? 0))
    return { patch: { searchSessions }, rows: searchSessions.length, warnings }
  },
}

export const searchHitsDataset: DatasetDescriptor = {
  key: 'searchHits',
  label: 'Search results',
  match: /SearchData_Tommy_ASIN\/[^/]*\.csv$/i,

  async parse(files) {
    const warnings: string[] = []
    const searchHits: SearchHit[] = []

    for (const file of files) {
      const { rows, warnings: csvWarnings } = parseCsv(await file.text())
      warnings.push(...csvWarnings.map((warning) => `${file.path}: ${warning}`))
      for (const raw of rows) {
        const row = raw as RawSearchHitRow
        searchHits.push({
          searchAt: epochMs(row.search_date),
          keywords: sentinel(row.keywords),
          asin: sentinel(row.ASIN),
          productName: sentinel(row.product_name),
          position: int(row.position),
          page: int(row.page),
          totalFound: int(row.total_found),
          totalDisplayed: int(row.total_displayed),
          clicked: yesNo(row.clicked) ?? false,
          added: yesNo(row.added) ?? false,
          purchased: yesNo(row.purchased) ?? false,
          isOrganic: yesNo(row.is_organic_result),
          isSponsored: yesNo(row.is_sponsored_result),
          deviceType: sentinel(row.device_type),
          os: sentinel(row.operating_system_name),
          searchType: sentinel(row.search_type),
        })
      }
    }

    searchHits.sort((a, b) => (a.searchAt ?? 0) - (b.searchAt ?? 0))
    return { patch: { searchHits }, rows: searchHits.length, warnings }
  },
}
