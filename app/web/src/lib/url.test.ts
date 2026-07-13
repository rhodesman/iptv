import { describe, it, expect } from 'vitest'
import { filtersToQuery, queryToFilters } from './url'
import { EMPTY_FILTERS } from './types'

describe('url filter state', () => {
  it('round-trips filters through a query string', () => {
    const f = { ...EMPTY_FILTERS, categories: ['news', 'sports'], countries: ['US'], search: 'bbc', hideAdult: true }
    const q = filtersToQuery(f)
    expect(queryToFilters(q)).toEqual(f)
  })
  it('returns empty filters for empty query', () => {
    expect(queryToFilters('')).toEqual(EMPTY_FILTERS)
  })
})
