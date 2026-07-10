import { useState } from 'react'
import type { Catalog, CountryFacet, Facet, FilterState } from '../lib/types'

type Axis = 'categories' | 'countries' | 'languages'

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter(x => x !== id) : [...list, id]
}

function byName(a: Facet, b: Facet): number {
  return a.name.localeCompare(b.name)
}

export function FilterSidebar({
  filters,
  catalogFilters,
  onChange
}: {
  filters: FilterState
  catalogFilters: Catalog['filters']
  onChange(next: FilterState): void
}) {
  const [collapsed, setCollapsed] = useState<Record<Axis, boolean>>({
    categories: false,
    countries: false,
    languages: false
  })

  const section = (title: string, axis: Axis, facets: (Facet | CountryFacet)[]) => {
    const isCollapsed = collapsed[axis]
    const sorted = [...facets].sort(byName)
    return (
      <div className="facet" key={axis}>
        <h4>
          <button
            type="button"
            className="facet-toggle"
            aria-expanded={!isCollapsed}
            onClick={() => setCollapsed(c => ({ ...c, [axis]: !c[axis] }))}
          >
            <span className="caret" aria-hidden="true">{isCollapsed ? '▸' : '▾'}</span>
            {title}
          </button>
        </h4>
        {!isCollapsed &&
          sorted.map(f => (
            <label key={f.id}>
              <input
                type="checkbox"
                checked={filters[axis].includes(f.id)}
                onChange={() => onChange({ ...filters, [axis]: toggle(filters[axis], f.id) })}
              />
              <span>
                {'flag' in f && f.flag ? `${f.flag} ` : ''}
                {f.name} <span className="badge">{f.count}</span>
              </span>
            </label>
          ))}
      </div>
    )
  }

  // when adult content is hidden, drop the synthetic NSFW facet so it can't be
  // selected into an empty result
  const categoryFacets = filters.hideAdult
    ? catalogFilters.categories.filter(f => f.id !== 'nsfw')
    : catalogFilters.categories

  return (
    <aside className="sidebar">
      <label>
        <input
          type="checkbox"
          checked={filters.hideAdult}
          onChange={() => onChange({ ...filters, hideAdult: !filters.hideAdult })}
        />
        <span>Hide adult</span>
      </label>
      {section('Category', 'categories', categoryFacets)}
      {section('Country', 'countries', catalogFilters.countries)}
      {section('Language', 'languages', catalogFilters.languages)}
    </aside>
  )
}
