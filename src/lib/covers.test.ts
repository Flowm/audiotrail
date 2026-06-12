import { describe, expect, it } from 'vitest'

import { coverHue, coverUrl, titleInitials } from './covers'

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

describe('coverUrl', () => {
  it('builds the Amazon CDN url from the ASIN', () => {
    expect(coverUrl('B0FZVDL7K2')).toBe('https://m.media-amazon.com/images/P/B0FZVDL7K2.jpg')
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
