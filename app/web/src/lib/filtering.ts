import type { ChannelEntry, FilterState } from './types'

export function filterChannels(channels: ChannelEntry[], filters: FilterState): ChannelEntry[] {
  const search = filters.search.trim().toLowerCase()
  return channels.filter(ch => {
    if (filters.hideAdult && ch.isNsfw) return false
    if (filters.categories.length && !filters.categories.some(c => ch.categories.includes(c))) return false
    if (filters.countries.length && !(ch.country && filters.countries.includes(ch.country))) return false
    if (filters.languages.length && !filters.languages.some(l => ch.languages.includes(l))) return false
    if (search && !ch.name.toLowerCase().includes(search)) return false
    return true
  })
}
