import { describe, expect, it } from 'vitest'

import { audnexusRegion, coverHue, titleInitials } from './covers'

describe('coverHue', () => {
  it('is deterministic and in range', () => {
    expect(coverHue('B0FZVDL7K2')).toBe(coverHue('B0FZVDL7K2'))
    expect(coverHue('B0FZVDL7K2')).not.toBe(coverHue('1473564921'))
    for (const key of ['a', 'B0FZVDL7K2', 'Die Känguru-Rebellion']) {
      const hue = coverHue(key)
      expect(hue).toBeGreaterThanOrEqual(0)
      expect(hue).toBeLessThan(360)
    }
  })
})

describe('audnexusRegion', () => {
  it('maps the country code first', () => {
    expect(audnexusRegion('DE', 'www.audible.com')).toBe('de')
    expect(audnexusRegion('us', null)).toBe('us')
    expect(audnexusRegion('AT', null)).toBe('de')
  })

  it('falls back to the marketplace domain', () => {
    expect(audnexusRegion(null, 'www.audible.de')).toBe('de')
    expect(audnexusRegion(null, 'www.audible.co.uk')).toBe('uk')
    expect(audnexusRegion(null, 'www.audible.com')).toBe('us')
  })

  it('defaults to us when nothing matches', () => {
    expect(audnexusRegion(null, null)).toBe('us')
    expect(audnexusRegion('ZZ', 'example.org')).toBe('us')
  })
})

describe('titleInitials', () => {
  it('skips stop words and splits hyphenated words', () => {
    expect(titleInitials('The Wind and Truth')).toBe('WT')
    expect(titleInitials('Die Känguru-Rebellion')).toBe('KR')
    expect(titleInitials('Oathbringer')).toBe('O')
  })

  it('falls back to any word, then a question mark', () => {
    expect(titleInitials('Der Die Das')).toBe('DD')
    expect(titleInitials('   ')).toBe('?')
  })
})
