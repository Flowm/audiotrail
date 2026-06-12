import { describe, expect, it } from 'vitest'

import type { VirtualFile } from '../provider'

import { billingsDataset } from './billings'
import { collectionsDataset } from './collections'
import { creditsDataset } from './credits'
import { membershipEventsDataset } from './misc'
import { purchasesDataset } from './purchases'
import { searchHitsDataset } from './search'
import { wishlistDataset } from './wishlist'

const vf = (path: string, content: string): VirtualFile => ({
  path,
  text: () => Promise.resolve(content),
})

describe('purchasesDataset', () => {
  it('parses orders with credit/cash semantics intact', async () => {
    const csv =
      '﻿"Order Place Date","Order Fulfill Date","Order Settle Date","Order ID","Status","Type","Preorder Desc","Sale Type Desc","Royalty Sale Type","Regular Price","Units","Discount","Consumed Credit","Price Paid Member","Tax Rate","Tax","Partner Revenue","Net Sales","Net Price","Currency","Product Name","ASIN","Action","Whispersync"\n' +
      '"2026-03-17","2026-03-17","Not Available","D01-1111111-1111111","Completed","CREDIT","NON-PRE-ORDER","AL","AL","37.20","1","-9.30","1.00","0.00","0.0699","0.00","0.000000","0.000000","0.00","EUR","Some Book","B000TEST01","mobile Store Anon iPhone","Yes"\n' +
      '"2026-04-01","Not Available","Not Available","D01-2222222-2222222","Completed","CASH","NON-PRE-ORDER","ALOP","EXCLUDE","9.95","1","0.00","0.00","9.95","0.0699","0.65","0.000000","9.300000","9.30","EUR","Audible Guthaben","Not Available","Website","No"\n'

    const result = await purchasesDataset.parse([
      vf('Audible.PurchaseHistory/Audible.PurchaseHistory.csv', csv),
    ])
    expect(result.rows).toBe(2)
    const [credit, cash] = result.patch.purchases!
    expect(credit!.type).toBe('CREDIT')
    expect(credit!.consumedCredit).toBe(1)
    expect(credit!.discount).toBe(-9.3)
    expect(credit!.preorder).toBe(false)
    expect(cash!.saleType).toBe('ALOP')
    expect(cash!.pricePaid).toBe(9.95)
    expect(cash!.asin).toBeNull()
  })
})

describe('creditsDataset', () => {
  it('maps lifecycle fields and the -1 order sentinel', async () => {
    const csv =
      '﻿"Issue Date","Credit Reason","Plan","Consumed Status","Credit Status","Consumed Date","Expire Date","Consumed Order","Original Credit","Consumed Credit","Remaining Credit","Original Credit Revenue","Consumed Credit Revenue","Remaining Credit Revenue","Currency Code"\n' +
      '"2025-11-10","New Annual","Flexi Annual","consumed","Inactive","2025-11-12","2028-12-31","D01-1733589-3887025","1.00","1.00","0.00","7.39","7.39","0.00","EUR"\n' +
      '"2026-01-10","Loyalty Reward","Not Available","UNKNOWN","Active","UNKNOWN","Not Available","-1","1.00","0.00","1.00","0.00","0.00","0.00","EUR"\n'

    const result = await creditsDataset.parse([vf('Audible.Credits/Audible.Credits.csv', csv)])
    expect(result.rows).toBe(2)
    const [spent, unused] = result.patch.credits!
    expect(spent!.consumed).toBe(true)
    expect(spent!.isActive).toBe(false)
    expect(spent!.consumedOrderId).toBe('D01-1733589-3887025')
    expect(spent!.valueEur).toBe(7.39)
    expect(unused!.consumed).toBe(false)
    expect(unused!.consumedStatus).toBeNull()
    expect(unused!.consumedOrderId).toBeNull()
    expect(unused!.expireDate).toBeNull()
  })
})

describe('billingsDataset', () => {
  it('parses charges and vets', async () => {
    const csv =
      '﻿"Tax Create Date","Billing Period End Date","Billing Period Start Date","Status Last Updated Date","Base Amount","Tax","Total Amount","Currency","Type","Plan","Plan Billing Freq","Plan Billing Fee","Offer Name","Offer Type","Merchant Name","Tax Reason","Status"\n' +
      '"2025-11-10","2026-11-09","2025-11-10","2025-11-10","177.52","12.43","189.95","EUR","Charge","Flexi Annual","12","189.95","Audible-Abo (24 Guthaben)","No Offer","Audible GmbH","Subscription_Renewal","ChargeSucceeded"\n' +
      '"2021-06-08","2021-07-07","2021-06-08","2021-06-08","0.00","0.00","0.00","EUR","Vet","Flexi Monthly","1","0.00","Audible-Probeabo","Trial","Audible GmbH","Subscription_Signup","VetSucceeded"\n'

    const result = await billingsDataset.parse([
      vf('Audible.MembershipBillings/Audible.MembershipBillings.csv', csv),
    ])
    expect(result.rows).toBe(2)
    const [trial, charge] = result.patch.billings! // sorted by date asc
    expect(trial!.type).toBe('Vet')
    expect(charge!.totalAmount).toBe(189.95)
    expect(charge!.billingFreqMonths).toBe(12)
  })
})

describe('wishlistDataset', () => {
  it('parses lifecycle rows', async () => {
    const csv =
      '﻿"Add Date","Delete Date","Product Name","ASIN","Add Count","Delete Count","Status"\n' +
      '"2026-03-13","Not Available","Wished Book","B000WISH01","1","0","Wishlist Item Added"\n'
    const result = await wishlistDataset.parse([vf('Audible.Wishlist/Audible.Wishlist.csv', csv)])
    expect(result.rows).toBe(1)
    expect(result.patch.wishlist![0]!.deleteDate).toBeNull()
  })
})

describe('collectionsDataset', () => {
  const csv =
    '﻿title_deletion_date,collection_creation_date,title_added_date,is_title_deleted,is_collection_discoverable,last_modified_date,product_name,collection_name,collection_description,total_items_in_collection,is_public_collection,is_collection_archived,profile_name,content_delivery_type,ASIN,collection_type,marketplace,collection_id\n' +
    'Not Available,2021-06-07T23:57:56Z,Not Available,Not Available,No,2021-06-07T23:57:56Z,Not Available,2Listen,my queue,2,No,No,Flo,Not Available,Not Available,UserCollection,www.audible.de,aaaa-bbbb\n' +
    'Not Available,2021-06-07T23:57:56Z,2021-07-01T10:00:00Z,No,No,2021-07-01T10:00:00Z,Book One,2Listen,my queue,Not Available,No,No,Flo,SinglePartBook,B000COLL01,UserCollection,www.audible.de,aaaa-bbbb\n' +
    'Not Available,2021-06-01T00:00:00Z,2021-08-01T00:00:00Z,No,No,2021-08-01T00:00:00Z,Book Two,Not Available,Not Available,Not Available,No,No,Flo,SinglePartBook,B000COLL02,PermanentCollection,www.audible.de,PURCHASE\n'

  it('splits header vs item rows and dedupes across identical files', async () => {
    const result = await collectionsDataset.parse([
      vf('Audible.AudibleGlobalLibraryService/datasets/Collections_2/Collections_2.csv', csv),
      vf('Audible.AudibleGlobalLibraryService/datasets/Collections_2_2/Collections_2_2.csv', csv),
    ])
    expect(result.patch.collections).toHaveLength(1)
    expect(result.patch.collectionItems).toHaveLength(2)

    const info = result.patch.collections![0]!
    expect(info.id).toBe('aaaa-bbbb')
    expect(info.isSystem).toBe(false)
    expect(info.totalItems).toBe(2)

    const purchaseItem = result.patch.collectionItems!.find((i) => i.collectionId === 'PURCHASE')!
    expect(purchaseItem.asin).toBe('B000COLL02')
  })
})

describe('searchHitsDataset', () => {
  it('parses positions and trusts num_* counters over the dead yes/no flags', async () => {
    const csv =
      '﻿partition_date,keywords,ASIN,product_name,position,page,total_found,total_displayed,clicked,added,purchased,num_clicks,num_adds,num_purchases,is_organic_result,is_sponsored_result,device_type,operating_system_name,search_type,search_date\n' +
      '2025-07-26T00:00:00Z,brandon sanderson,B000SRCH01,Wind and Truth,1,1,318,50,yes,no,no,0,0,0,yes,no,iPhone,iOS,keyword_search,2025-07-26T12:54:15Z\n' +
      '2025-07-26T00:00:00Z,brandon sanderson,B000SRCH02,Oathbringer,4,1,318,50,no,no,0,1,0,1,yes,no,iPhone,iOS,keyword_search,2025-07-26T12:55:15Z\n'
    const result = await searchHitsDataset.parse([
      vf('Digital.Audible.SearchData_Tommy_ASIN/Digital.Audible.SearchData_Tommy_ASIN.csv', csv),
    ])
    const [flagged, counted] = result.patch.searchHits!
    expect(flagged!.clicked).toBe(true)
    expect(flagged!.purchased).toBe(false)
    expect(flagged!.position).toBe(1)
    expect(flagged!.isOrganic).toBe(true)
    expect(flagged!.searchAt).toBe(Date.UTC(2025, 6, 26, 12, 54, 15))
    expect(counted!.clicked).toBe(true)
    expect(counted!.purchased).toBe(true)
  })
})

describe('membershipEventsDataset', () => {
  it('collects positive count columns as flags', async () => {
    const csv =
      '﻿"Event Date","Event Reason","Business Event","Action","Event Count","New Trial Count","Convert Trial Count","Hiatus Start Count"\n' +
      '"2021-06-08","Not Available","Event occurs at the time of new membership trial selection","Trial start","1","1","0","0"\n'
    const result = await membershipEventsDataset.parse([
      vf('Audible.MembershipEvent/Audible.MembershipEvent.csv', csv),
    ])
    const event = result.patch.membershipEvents![0]!
    expect(event.flags).toEqual(['New Trial'])
    expect(event.eventDate).toBe('2021-06-08')
  })
})
