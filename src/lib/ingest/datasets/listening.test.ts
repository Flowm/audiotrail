import { describe, expect, it } from 'vitest'

import type { VirtualFile } from '../provider'

import { listeningDataset } from './listening'

const vf = (path: string, content: string): VirtualFile => ({
  path,
  text: () => Promise.resolve(content),
})

const HEADER =
  '"Start Date","End Date","Event Duration Milliseconds","Start Position Milliseconds","End Position Milliseconds","Product Name","ASIN","Book Length Milliseconds","Delivery Type","Narration Speed","Bookmark","Audio Type","Asin Owned","Listening Mode","Store","App Version","Local Timezone"'

const MAIN_CSV =
  '﻿' +
  [
    HEADER,
    '"2024-01-02","2024-01-02","600000","0","600000","Test Book, Part 1","B000TEST01","3600000","Download","1.25","0","FullTitle","No","Offline","Audible","4.0","Europe/Berlin"',
    '"2024-01-01","2024-01-01","300000","9019256","9319256","Sample Thing","B000TEST02","Not Available","Streaming","0.00","0","CatalogSample","No","Online","Audible","4.0","Europe/Berlin"',
    '"2024-01-03","2024-01-03","Not Available","","","Row without duration","B000TEST09","","","","0","FullTitle","No","Online","Audible","4.0","Europe/Berlin"',
  ].join('\r\n')

const KID_CSV = '﻿' + [HEADER, '"2024-02-01","2024-02-01","120000","0","120000","Kids Book","B000TEST03","240000","Download","1.00","0","FullTitle","No","Online","Audible","4.0","Europe/Berlin"'].join('\n')

describe('listeningDataset', () => {
  it('matches per-profile listening files, with or without a wrapper dir', () => {
    expect(listeningDataset.match.test('Audible.Listening/Account Holder/Listening.csv')).toBe(true)
    expect(listeningDataset.match.test('Takeout/Audible.Listening/Kids Profile 1/Listening.csv')).toBe(true)
    expect(listeningDataset.match.test('Audible.PurchaseHistory/Audible.PurchaseHistory.csv')).toBe(false)
  })

  it('parses sessions, extracts profiles and skips incomplete rows', async () => {
    const result = await listeningDataset.parse([
      vf('Audible.Listening/Main Profile/Listening.csv', MAIN_CSV),
      vf('Audible.Listening/Kid/Listening.csv', KID_CSV),
    ])

    expect(result.rows).toBe(3)
    expect(result.patch.profiles).toEqual(['Main Profile', 'Kid'])
    expect(result.warnings.some((w) => w.includes('skipped 1'))).toBe(true)

    const sessions = result.patch.listening!
    expect(sessions.map((s) => s.startDate)).toEqual(['2024-01-01', '2024-01-02', '2024-02-01'])

    const [sample, full] = sessions
    expect(full!.productName).toBe('Test Book, Part 1')
    expect(full!.narrationSpeed).toBe(1.25)
    expect(full!.deliveryType).toBe('Download')
    expect(full!.profile).toBe('Main Profile')

    expect(sample!.audioType).toBe('CatalogSample')
    expect(sample!.bookLengthMs).toBeNull()
    expect(sample!.narrationSpeed).toBeNull()
    expect(sample!.startPositionMs).toBe(9019256)
  })
})
