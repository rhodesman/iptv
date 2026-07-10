import { describe, it, expect } from 'vitest'
import { filterChannels } from './filtering'
import type { ChannelEntry, FilterState } from './types'

const base: FilterState = { categories: [], countries: [], languages: [], search: '', hideAdult: false }

function ch(p: Partial<ChannelEntry>): ChannelEntry {
  return {
    id: p.id || 'x', name: p.name || 'X', logo: null,
    categories: p.categories || [], country: p.country ?? null,
    languages: p.languages || [], isNsfw: p.isNsfw || false,
    streams: p.streams || [{ url: 'u', quality: null, label: null, userAgent: null, referrer: null }]
  }
}

const data: ChannelEntry[] = [
  ch({ id: 'a', name: 'BBC News', categories: ['news'], country: 'GB', languages: ['eng'] }),
  ch({ id: 'b', name: 'ESPN', categories: ['sports'], country: 'US', languages: ['eng'] }),
  ch({ id: 'c', name: 'Canal Sur', categories: ['general'], country: 'ES', languages: ['spa'] }),
  ch({ id: 'd', name: 'Adult XXX', categories: ['xxx'], country: 'US', languages: ['eng'], isNsfw: true })
]

describe('filterChannels', () => {
  it('returns all when no filters', () => {
    expect(filterChannels(data, base)).toHaveLength(4)
  })
  it('OR within a facet', () => {
    const r = filterChannels(data, { ...base, categories: ['news', 'sports'] })
    expect(r.map(c => c.id).sort()).toEqual(['a', 'b'])
  })
  it('AND across facets', () => {
    const r = filterChannels(data, { ...base, categories: ['sports'], country: undefined as never, countries: ['US'] })
    expect(r.map(c => c.id)).toEqual(['b'])
  })
  it('search is case-insensitive substring on name', () => {
    expect(filterChannels(data, { ...base, search: 'bbc' }).map(c => c.id)).toEqual(['a'])
  })
  it('hideAdult removes nsfw channels', () => {
    expect(filterChannels(data, { ...base, hideAdult: true }).some(c => c.id === 'd')).toBe(false)
  })
  it('language facet filters by code', () => {
    expect(filterChannels(data, { ...base, languages: ['spa'] }).map(c => c.id)).toEqual(['c'])
  })
})
