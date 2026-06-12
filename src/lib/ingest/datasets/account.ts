import type { AccountInfo } from '@/types/models'
import type { RawAccountJson } from '@/types/raw'

import { epochMs, yesNo } from '../normalize'

import type { DatasetDescriptor } from './descriptor'

export const accountDataset: DatasetDescriptor = {
  key: 'account',
  label: 'Account attributes',
  match:
    /(AccountDetails|AccountCustomerAttribute|CustomerOnboardingAttributes|CustomerSegment)\.json$/i,

  async parse(files) {
    const warnings: string[] = []
    // marketplace → attribute → values seen across the four singleton files
    const perMarketplace = new Map<string, Map<string, string[]>>()

    for (const file of files) {
      let json: RawAccountJson
      try {
        json = JSON.parse(await file.text()) as RawAccountJson
      } catch {
        warnings.push(`${file.path}: unreadable JSON — skipped`)
        continue
      }
      for (const [marketplace, attributes] of Object.entries(json)) {
        if (typeof attributes !== 'object' || attributes === null) continue
        let bucket = perMarketplace.get(marketplace)
        if (!bucket) {
          bucket = new Map()
          perMarketplace.set(marketplace, bucket)
        }
        for (const [attribute, value] of Object.entries(attributes)) {
          if (typeof value !== 'string') continue
          const values = bucket.get(attribute)
          if (values) values.push(value)
          else bucket.set(attribute, [value])
        }
      }
    }

    const account: AccountInfo[] = [...perMarketplace.entries()].map(
      ([marketplace, attributes]) => {
        const first = (name: string): string | null => attributes.get(name)?.[0] ?? null
        const creationDates = (attributes.get('Creation Date') ?? [])
          .map((value) => epochMs(value))
          .filter((value): value is number => value !== null)
        return {
          marketplace,
          creationDate: creationDates.length > 0 ? Math.min(...creationDates) : null,
          region: first('Operational Region'),
          countryCode: first('Country Code'),
          customerSegment: first('Customer Segment'),
          appDownloaded: yesNo(first('App Downloaded')),
          hasLibraryContent: yesNo(first('Has Library Content')),
        }
      },
    )

    return {
      patch: { account },
      rows: account.length,
      detail:
        account.length > 0
          ? `marketplace${account.length === 1 ? '' : 's'}: ${account.map((a) => a.marketplace).join(', ')}`
          : undefined,
      warnings,
    }
  },
}
