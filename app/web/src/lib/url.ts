import { EMPTY_FILTERS, FilterState } from './types'

export function filtersToQuery(f: FilterState): string {
  const p = new URLSearchParams()
  f.categories.forEach(c => p.append('cat', c))
  f.countries.forEach(c => p.append('country', c))
  f.languages.forEach(l => p.append('lang', l))
  if (f.search) p.set('q', f.search)
  if (f.hideAdult) p.set('sfw', '1')
  return p.toString()
}

export function queryToFilters(query: string): FilterState {
  const p = new URLSearchParams(query)
  return {
    categories: p.getAll('cat'),
    countries: p.getAll('country'),
    languages: p.getAll('lang'),
    search: p.get('q') || '',
    hideAdult: p.get('sfw') === '1'
  }
}

export { EMPTY_FILTERS }
