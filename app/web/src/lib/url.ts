import { EMPTY_FILTERS, FilterState } from './types'

export function filtersToQuery(f: FilterState): string {
  const p = new URLSearchParams()
  if (f.categories.length) p.set('cat', f.categories.join(','))
  if (f.countries.length) p.set('country', f.countries.join(','))
  if (f.languages.length) p.set('lang', f.languages.join(','))
  if (f.search) p.set('q', f.search)
  if (f.hideAdult) p.set('sfw', '1')
  return p.toString()
}

export function queryToFilters(query: string): FilterState {
  const p = new URLSearchParams(query)
  const list = (k: string) => (p.get(k) ? p.get(k)!.split(',') : [])
  return {
    categories: list('cat'),
    countries: list('country'),
    languages: list('lang'),
    search: p.get('q') || '',
    hideAdult: p.get('sfw') === '1'
  }
}

export { EMPTY_FILTERS }
