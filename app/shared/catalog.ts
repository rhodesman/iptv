export interface StreamEntry {
  url: string
  quality: string | null
  label: string | null
  userAgent: string | null
  referrer: string | null
}

export interface ChannelEntry {
  id: string
  name: string
  logo: string | null
  categories: string[]
  country: string | null
  languages: string[]
  isNsfw: boolean
  streams: StreamEntry[]
}

export interface Facet {
  id: string
  name: string
  count: number
}

export interface CountryFacet extends Facet {
  flag: string
}

export interface Catalog {
  generatedAt: string
  filters: {
    categories: Facet[]
    countries: CountryFacet[]
    languages: Facet[]
  }
  channels: ChannelEntry[]
}

export function countryCodeToFlag(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return ''
  const BASE = 0x1f1e6
  const cc = code.toUpperCase()
  return String.fromCodePoint(BASE + cc.charCodeAt(0) - 65, BASE + cc.charCodeAt(1) - 65)
}
