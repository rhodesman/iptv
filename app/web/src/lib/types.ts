export type {
  Catalog,
  ChannelEntry,
  StreamEntry,
  Facet,
  CountryFacet
} from '../../../shared/catalog'

export interface FilterState {
  categories: string[]
  countries: string[]
  languages: string[]
  search: string
  hideAdult: boolean
}

export const EMPTY_FILTERS: FilterState = {
  categories: [],
  countries: [],
  languages: [],
  search: '',
  hideAdult: false
}
