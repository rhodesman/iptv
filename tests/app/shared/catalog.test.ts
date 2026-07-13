import { countryCodeToFlag } from '../../../app/shared/catalog'

describe('countryCodeToFlag', () => {
  it('converts a two-letter ISO code to a flag emoji', () => {
    expect(countryCodeToFlag('US')).toBe('🇺🇸')
    expect(countryCodeToFlag('gb')).toBe('🇬🇧')
  })
  it('returns empty string for invalid codes', () => {
    expect(countryCodeToFlag('USA')).toBe('')
    expect(countryCodeToFlag('')).toBe('')
  })
})
