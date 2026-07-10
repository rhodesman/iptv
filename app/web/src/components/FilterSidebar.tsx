import type { Catalog, CountryFacet, Facet, FilterState } from '../lib/types'

type Axis = 'categories' | 'countries' | 'languages'

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter(x => x !== id) : [...list, id]
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
  const section = (title: string, axis: Axis, facets: (Facet | CountryFacet)[]) => (
    <div className="facet">
      <h4>{title}</h4>
      {facets.map(f => (
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
      {section('Category', 'categories', catalogFilters.categories)}
      {section('Country', 'countries', catalogFilters.countries)}
      {section('Language', 'languages', catalogFilters.languages)}
    </aside>
  )
}
