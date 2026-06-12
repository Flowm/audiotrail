import { describe, expect, it } from 'vitest'

import { isoDate } from '@/lib/ingest/normalize'
import type { BillingEvent, Credit, IsoDate, Purchase } from '@/types/models'

import {
  costPerYear,
  creditFlow,
  creditSankeyData,
  creditsSavings,
  expiringCredits,
  monthlySpend,
  unusedActiveCredits,
} from './money'

const d = (s: string): IsoDate => isoDate(s)!

function billing(over: Partial<BillingEvent> & { billingDate: IsoDate }): BillingEvent {
  return {
    periodStart: null,
    periodEnd: null,
    baseAmount: null,
    tax: null,
    totalAmount: 0,
    currency: 'EUR',
    type: 'Charge',
    plan: null,
    billingFreqMonths: null,
    planFee: null,
    offerName: null,
    offerType: null,
    taxReason: null,
    status: null,
    ...over,
  }
}

function purchase(over: Partial<Purchase> & { orderPlaceDate: IsoDate; orderId: string }): Purchase {
  return {
    orderFulfillDate: null,
    status: null,
    type: 'CREDIT',
    preorder: false,
    saleType: 'AL',
    regularPrice: null,
    discount: null,
    consumedCredit: null,
    pricePaid: null,
    tax: null,
    currency: 'EUR',
    productName: null,
    asin: null,
    channel: null,
    ...over,
  }
}

function credit(over: Partial<Credit> & { issueDate: IsoDate }): Credit {
  return {
    reason: 'New Monthly',
    plan: null,
    consumedStatus: null,
    isActive: true,
    consumedDate: null,
    expireDate: null,
    consumedOrderId: null,
    consumed: false,
    valueEur: null,
    ...over,
  }
}

describe('monthlySpend', () => {
  it('buckets charges and cash purchases by month, gap-filled', () => {
    const rows = monthlySpend(
      [
        billing({ billingDate: d('2024-01-10'), totalAmount: 9.95 }),
        billing({ billingDate: d('2024-01-20'), totalAmount: 0, type: 'Vet' }),
        billing({ billingDate: d('2024-03-10'), totalAmount: 9.95 }),
      ],
      [
        purchase({ orderPlaceDate: d('2024-01-15'), orderId: 'D1', type: 'CASH', pricePaid: 5.5 }),
        purchase({ orderPlaceDate: d('2024-02-15'), orderId: 'D2', type: 'CREDIT', pricePaid: 0 }),
      ],
    )
    expect(rows).toEqual([
      { month: '2024-01', membership: 9.95, cash: 5.5 },
      { month: '2024-02', membership: 0, cash: 0 },
      { month: '2024-03', membership: 9.95, cash: 0 },
    ])
  })
})

describe('creditFlow / creditSankeyData', () => {
  const credits = [
    credit({ issueDate: d('2024-01-01'), reason: 'New Annual', consumed: true, isActive: false }),
    credit({ issueDate: d('2024-02-01'), reason: 'New Annual', consumed: false, isActive: false }),
    credit({ issueDate: d('2024-03-01'), reason: 'Stock Up', consumed: false, isActive: true }),
    credit({ issueDate: d('2024-04-01'), reason: 'Trial', consumed: true, isActive: false }),
  ]

  it('partitions every credit into exactly one bucket', () => {
    const flow = creditFlow(credits)
    expect(flow.total).toBe(4)
    expect(flow.consumed + flow.expired + flow.active).toBe(flow.total)
    expect(flow.consumed).toBe(2)
    expect(flow.expired).toBe(1)
    expect(flow.active).toBe(1)
  })

  it('produces a balanced sankey (in = out at the center node)', () => {
    const flow = creditFlow(credits)
    const sankey = creditSankeyData(flow)
    const inflow = sankey.links
      .filter((link) => link.target === '4 credits')
      .reduce((sum, link) => sum + link.value, 0)
    const outflow = sankey.links
      .filter((link) => link.source === '4 credits')
      .reduce((sum, link) => sum + link.value, 0)
    expect(inflow).toBe(4)
    expect(outflow).toBe(4)
  })
})

describe('costPerYear', () => {
  it('divides yearly spend by yearly hours and finished books', () => {
    const rows = costPerYear(
      [billing({ billingDate: d('2024-02-01'), totalAmount: 120 })],
      [purchase({ orderPlaceDate: d('2024-06-01'), orderId: 'D1', type: 'CASH', pricePaid: 30 })],
      [
        { date: d('2024-01-01'), ms: 40 * 3_600_000, sessions: 1 },
        { date: d('2024-06-01'), ms: 10 * 3_600_000, sessions: 1 },
      ],
      [
        {
          key: 'A',
          asin: 'A',
          title: 'A',
          library: null,
          totalMs: 1,
          sessionCount: 1,
          daysListened: 1,
          firstListen: d('2024-01-02'),
          lastListen: d('2024-05-02'),
          bookLengthMs: null,
          maxEndPositionMs: null,
          completion: 1,
          finished: true,
        },
      ],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      year: 2024,
      spend: 150,
      hours: 50,
      costPerHour: 3,
      finished: 1,
      costPerFinished: 150,
    })
  })
})

describe('creditsSavings', () => {
  it('compares list-price value of credit buys against membership + packs', () => {
    const savings = creditsSavings(
      [
        purchase({ orderPlaceDate: d('2024-01-01'), orderId: 'D1', consumedCredit: 1, regularPrice: 40 }),
        purchase({ orderPlaceDate: d('2024-02-01'), orderId: 'D2', consumedCredit: 1, regularPrice: 35 }),
        purchase({ orderPlaceDate: d('2024-03-01'), orderId: 'D3', type: 'CASH', saleType: 'ALOP', pricePaid: 20 }),
      ],
      [billing({ billingDate: d('2024-01-10'), totalAmount: 30 })],
    )
    expect(savings.valueAtListPrice).toBe(75)
    expect(savings.membershipCost).toBe(30)
    expect(savings.creditPackCost).toBe(20)
    expect(savings.saved).toBe(25)
    expect(savings.creditPurchaseCount).toBe(2)
  })
})

describe('expiringCredits / unusedActiveCredits', () => {
  const now = Date.UTC(2026, 0, 1)
  const credits = [
    credit({ issueDate: d('2025-01-01'), expireDate: d('2026-02-01') }),
    credit({ issueDate: d('2025-01-01'), expireDate: d('2027-01-01') }),
    credit({ issueDate: d('2025-01-01'), expireDate: d('2025-12-01') }),
    credit({ issueDate: d('2025-01-01'), expireDate: d('2026-01-20'), consumed: true }),
  ]

  it('returns only unused active credits expiring within the window', () => {
    const expiring = expiringCredits(credits, now, 90)
    expect(expiring).toHaveLength(1)
    expect(expiring[0]!.expireDate).toBe('2026-02-01')
  })

  it('counts unused active credits', () => {
    expect(unusedActiveCredits(credits)).toBe(3)
  })
})
