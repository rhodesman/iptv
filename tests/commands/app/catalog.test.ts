import { execSync } from 'child_process'
import * as fs from 'fs-extra'
import type { Catalog } from '../../../app/shared/catalog'

const OUT = 'tests/__data__/output/catalog.json'
const ENV_VAR =
  'cross-env STREAMS_DIR=tests/__data__/input/playlist_generate ' +
  'DATA_DIR=tests/__data__/input/data ' +
  `CATALOG_PATH=${OUT}`

beforeEach(() => {
  fs.emptyDirSync('tests/__data__/output')
})

describe('app:catalog', () => {
  it('builds a catalog.json joining API metadata with repo streams', () => {
    const cmd = `${ENV_VAR} npm run app:catalog`
    const stdout = execSync(cmd, { encoding: 'utf8' })
    if (process.env.DEBUG === 'true') console.log(cmd, stdout)

    const catalog = fs.readJsonSync(OUT) as Catalog

    // structural invariants
    expect(typeof catalog.generatedAt).toBe('string')
    expect(catalog.channels.length).toBeGreaterThan(0)
    expect(catalog.filters.categories.length).toBeGreaterThan(0)

    // every channel has at least one stream and an id/name
    for (const ch of catalog.channels) {
      expect(ch.streams.length).toBeGreaterThan(0)
      expect(ch.id).toBeTruthy()
      expect(ch.name).toBeTruthy()
    }

    // facet counts are consistent with channel membership
    const newsFacet = catalog.filters.categories.find(f => f.id === 'news')
    if (newsFacet) {
      const actual = catalog.channels.filter(c => c.categories.includes('news')).length
      expect(newsFacet.count).toBe(actual)
    }

    // country facet carries a flag emoji
    for (const c of catalog.filters.countries) {
      expect(c.flag.length).toBeGreaterThan(0)
    }

    // a known fixture channel is present (Andorra TV, from ad.m3u)
    expect(catalog.channels.some(c => c.id === 'AndorraTV.ad')).toBe(true)
  })
})
