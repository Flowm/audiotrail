import { describe, expect, it } from 'vitest'

import { epochMs, int, isoDate, num, orderId, sentinel, splitList, yesNo } from './normalize'

describe('sentinel', () => {
  it('maps the null literals to null', () => {
    for (const literal of ['', '  ', 'Not Available', 'Not Applicable', 'UNKNOWN', 'Empty']) {
      expect(sentinel(literal)).toBeNull()
    }
    expect(sentinel(undefined)).toBeNull()
  })

  it('trims and passes real values through', () => {
    expect(sentinel(' Audible ')).toBe('Audible')
    expect(sentinel('0')).toBe('0')
  })
})

describe('num / int', () => {
  it('parses plain decimal strings', () => {
    expect(num('9.30')).toBe(9.3)
    expect(num('-9.30')).toBe(-9.3)
    expect(num('0.0699')).toBe(0.0699)
    expect(num('658969')).toBe(658969)
  })

  it('returns null for sentinels and garbage', () => {
    expect(num('Not Available')).toBeNull()
    expect(num('12,5')).toBeNull()
    expect(int('Empty')).toBeNull()
  })

  it('rounds ints', () => {
    expect(int('988')).toBe(988)
    expect(int('1.6')).toBe(2)
  })
})

describe('isoDate', () => {
  it('accepts date-only strings', () => {
    expect(isoDate('2026-04-22')).toBe('2026-04-22')
  })

  it('truncates ISO datetimes to the UTC day', () => {
    expect(isoDate('2021-06-07T23:57:56Z')).toBe('2021-06-07')
    expect(isoDate('2026-04-14T02:02:46.086Z')).toBe('2026-04-14')
  })

  it('rejects sentinels and non-dates', () => {
    expect(isoDate('UNKNOWN')).toBeNull()
    expect(isoDate('22.04.2026')).toBeNull()
    expect(isoDate(undefined)).toBeNull()
  })
})

describe('epochMs', () => {
  it('parses ISO datetimes', () => {
    expect(epochMs('2021-06-07T23:55:30.000Z')).toBe(Date.UTC(2021, 5, 7, 23, 55, 30))
  })

  it('returns null for sentinels', () => {
    expect(epochMs('Not Available')).toBeNull()
  })
})

describe('yesNo', () => {
  it('handles both casings', () => {
    expect(yesNo('Yes')).toBe(true)
    expect(yesNo('yes')).toBe(true)
    expect(yesNo('No')).toBe(false)
    expect(yesNo('no')).toBe(false)
  })

  it('returns null otherwise', () => {
    expect(yesNo('UNKNOWN')).toBeNull()
    expect(yesNo('maybe')).toBeNull()
  })
})

describe('splitList', () => {
  it('splits, trims and dedupes', () => {
    expect(splitList('Kyle Kirrin,Portal Books')).toEqual(['Kyle Kirrin', 'Portal Books'])
    expect(splitList(' A , B ,A,')).toEqual(['A', 'B'])
    expect(splitList('Not Available')).toEqual([])
  })
})

describe('orderId', () => {
  it("treats '-1' as null", () => {
    expect(orderId('-1')).toBeNull()
    expect(orderId('D01-1733589-3887025')).toBe('D01-1733589-3887025')
  })
})
