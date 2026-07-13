# IPTV Channel Browser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local web app that browses the IPTV channel catalog by category/country/language with search, and controls VLC live (click a channel → VLC plays it).

**Architecture:** A build step (`app:catalog`) reuses this repo's `loadData()` + `PlaylistParser` to join iptv-org API metadata with the repo's stream URLs into `app/catalog.json`. A Node/Express helper server serves a React/Vite SPA and `catalog.json`, and relays `/api/*` playback commands to VLC's HTTP interface. The SPA holds the whole catalog in memory and filters client-side.

**Tech Stack:** TypeScript throughout; Node + Express + axios (server, reusing repo `scripts/`); React 18 + Vite + Vitest + React Testing Library + @tanstack/react-virtual (SPA); Jest (existing) for the catalog builder and server.

## Global Constraints

- Language: **TypeScript**, run via `tsx` on the server/builder (matches repo). No `.js` sources.
- Reuse existing repo modules — do **not** re-implement data loading: `scripts/api.ts` (`loadData`, `data`), `scripts/core` (`PlaylistParser`), `scripts/models` (`Stream`), `scripts/constants.ts`.
- Server tests + catalog-builder tests run under the repo's **Jest** config (`testRegex: tests/(.*?/)?.*test.ts$`, `@swc/jest`). Frontend tests run under **Vitest**.
- Env-configurable paths, matching repo convention (`process.env.X || default`). New: `CATALOG_PATH` (default `app/catalog.json`), `VLC_HOST` (`localhost`), `VLC_PORT` (`8080`), `VLC_PASSWORD` (`''`), `APP_PORT` (`4000`).
- Line endings/format follow existing `.prettierrc` and `eslint.config.mjs`. Run `npm run lint` clean.
- Shared catalog TypeScript types live in `app/shared/catalog.ts` and are the single source of truth (imported by builder, server, and SPA — types only across the tsx/vite boundary).
- Frequent commits: one per task, after its tests pass.

---

## File Structure

**Create:**
- `app/shared/catalog.ts` — shared types + `countryCodeToFlag` helper.
- `scripts/commands/app/catalog.ts` — `buildCatalog()`, `writeCatalog()`, CLI entry (the `app:catalog` command).
- `app/server/config.ts` — `loadConfig(env)`.
- `app/server/vlc.ts` — `VlcClient`, `VlcError`.
- `app/server/index.ts` — `createApp(deps)`, `ensureCatalog()`, bootstrap `main()`.
- `app/web/index.html`, `app/web/vite.config.ts`, `app/web/src/main.tsx`, `app/web/src/App.tsx`.
- `app/web/src/lib/types.ts`, `app/web/src/lib/apiClient.ts`, `app/web/src/lib/filtering.ts`, `app/web/src/lib/url.ts`.
- `app/web/src/hooks/useCatalog.ts`, `app/web/src/hooks/useVlc.ts`.
- `app/web/src/components/{FilterSidebar,SearchBar,ChannelGrid,ChannelCard,NowPlayingBar,ErrorBanner}.tsx`.
- `app/web/src/styles.css`, `app/web/src/test/setup.ts`.
- `app/README.md`, `app/.env.example`.
- Tests: `tests/commands/app/catalog.test.ts`, `tests/app/server/config.test.ts`, `tests/app/server/vlc.test.ts`, `tests/app/server/index.test.ts`, and Vitest specs colocated as `*.test.ts(x)` under `app/web/src`.

**Modify:**
- `package.json` — add deps + `app:*` scripts.
- `.gitignore` — add `/app/catalog.json` and `/app/web/dist/`.

---

## Task 1: Project scaffolding, dependencies, and npm scripts

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `app/.env.example`
- Create: `app/web/vite.config.ts`
- Create: `app/web/src/test/setup.ts`
- Create: `app/tsconfig.json`

**Interfaces:**
- Produces: npm scripts `app:catalog`, `app:dev`, `app:build`, `app:start`, `app:test:web`; installed deps available to later tasks.

- [ ] **Step 1: Install base dependencies and API data**

Run:
```bash
npm install
```
Expected: `node_modules/` populated and `postinstall` runs `api:load`, creating `temp/data/*.json`. Verify:
```bash
ls temp/data/channels.json && echo OK
```
Expected: prints `temp/data/channels.json` then `OK`.

- [ ] **Step 2: Add app dependencies**

Run:
```bash
npm install --save express @tanstack/react-virtual react react-dom
npm install --save-dev @types/express @types/react @types/react-dom @vitejs/plugin-react vite vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event supertest @types/supertest concurrently
```
Expected: installs succeed, `package.json` updated.

- [ ] **Step 3: Add npm scripts**

In `package.json` `"scripts"`, add:
```json
"app:catalog": "tsx scripts/commands/app/catalog.ts",
"app:dev": "concurrently -k \"tsx watch app/server/index.ts\" \"vite --config app/web/vite.config.ts\"",
"app:build": "vite --config app/web/vite.config.ts build",
"app:start": "tsx app/server/index.ts",
"app:test:web": "vitest run --config app/web/vite.config.ts"
```

- [ ] **Step 4: Update .gitignore**

Append to `.gitignore`:
```
/app/catalog.json
/app/web/dist/
```

- [ ] **Step 5: Create app/.env.example**

`app/.env.example`:
```
# VLC HTTP interface (Preferences → Interface → Main interfaces → "Web", then set a Lua HTTP password)
VLC_HOST=localhost
VLC_PORT=8080
VLC_PASSWORD=changeme
# Helper server port
APP_PORT=4000
# Generated catalog location
CATALOG_PATH=app/catalog.json
```

- [ ] **Step 6: Create Vite + Vitest config**

`app/web/vite.config.ts`:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'app/web',
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:4000' } },
  build: { outDir: 'dist', emptyOutDir: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: 'app/web/src/test/setup.ts',
    include: ['app/web/src/**/*.test.{ts,tsx}']
  }
})
```

`app/web/src/test/setup.ts`:
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Create app tsconfig for the web app**

`app/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["web/src", "server", "shared"]
}
```

- [ ] **Step 8: Verify Jest still runs and commit**

Run:
```bash
npx jest tests/commands/playlist/format.test.ts
```
Expected: PASS (proves the toolchain still works after dependency changes).

```bash
git add package.json package-lock.json .gitignore app/.env.example app/web/vite.config.ts app/web/src/test/setup.ts app/tsconfig.json
git commit -m "chore(app): scaffold channel-browser deps, scripts, and config"
```

---

## Task 2: Shared catalog types and flag helper

**Files:**
- Create: `app/shared/catalog.ts`
- Test: `tests/app/shared/catalog.test.ts`

**Interfaces:**
- Produces:
  - `interface StreamEntry { url: string; quality: string | null; label: string | null; userAgent: string | null; referrer: string | null }`
  - `interface ChannelEntry { id: string; name: string; logo: string | null; categories: string[]; country: string | null; languages: string[]; isNsfw: boolean; streams: StreamEntry[] }`
  - `interface Facet { id: string; name: string; count: number }`
  - `interface CountryFacet extends Facet { flag: string }`
  - `interface Catalog { generatedAt: string; filters: { categories: Facet[]; countries: CountryFacet[]; languages: Facet[] }; channels: ChannelEntry[] }`
  - `function countryCodeToFlag(code: string): string`

- [ ] **Step 1: Write the failing test**

`tests/app/shared/catalog.test.ts`:
```ts
import { countryCodeToFlag } from '../../../app/shared/catalog'

describe('countryCodeToFlag', () => {
  it('converts a two-letter ISO code to a flag emoji', () => {
    expect(countryCodeToFlag('US')).toBe('🇺🇸')
    expect(countryCodeToFlag('gb')).toBe('🇬🇧')
  })
  it('returns empty string for invalid codes', () => {
    expect(countryCodeToFlag('USA')).toBe('')
    expect(countryCodeToFlag('')).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/app/shared/catalog.test.ts`
Expected: FAIL — cannot find module `app/shared/catalog`.

- [ ] **Step 3: Write minimal implementation**

`app/shared/catalog.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/app/shared/catalog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/shared/catalog.ts tests/app/shared/catalog.test.ts
git commit -m "feat(app): add shared catalog types and country flag helper"
```

---

## Task 3: Catalog builder (`app:catalog`)

**Files:**
- Create: `scripts/commands/app/catalog.ts`
- Test: `tests/commands/app/catalog.test.ts`

**Interfaces:**
- Consumes: `loadData`, `data` from `scripts/api.ts`; `PlaylistParser` from `scripts/core`; `Stream` from `scripts/models`; `STREAMS_DIR` from `scripts/constants`; types + `countryCodeToFlag` from `app/shared/catalog`.
- Consumes (Stream methods, already implemented in `scripts/models/stream.ts`): `stream.getChannel()` → `{ id, name, categories: string[], country: string, is_nsfw: boolean } | undefined`; `stream.getLanguages()` → `Collection<{ code: string; name: string }>`; `stream.getTvgLogo()` → `string`; `stream.getVerticalResolution()` → `number`; and fields `quality`, `label`, `url`, `user_agent`, `referrer`.
- Produces: `async function buildCatalog(): Promise<Catalog>`; `async function writeCatalog(path: string, catalog: Catalog): Promise<void>`.

- [ ] **Step 1: Write the failing test**

`tests/commands/app/catalog.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/commands/app/catalog.test.ts`
Expected: FAIL — `npm run app:catalog` errors because `scripts/commands/app/catalog.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

`scripts/commands/app/catalog.ts`:
```ts
import { Collection } from '@freearhey/core'
import { Storage } from '@freearhey/storage-js'
import { loadData, data as apiData } from '../../api'
import { PlaylistParser } from '../../core'
import { Stream } from '../../models'
import { STREAMS_DIR } from '../../constants'
import {
  Catalog,
  ChannelEntry,
  CountryFacet,
  Facet,
  StreamEntry,
  countryCodeToFlag
} from '../../../app/shared/catalog'
import * as fs from 'fs-extra'
import path from 'node:path'

const CATALOG_PATH = process.env.CATALOG_PATH || 'app/catalog.json'

export async function buildCatalog(): Promise<Catalog> {
  await loadData()

  const storage = new Storage(STREAMS_DIR)
  const parser = new PlaylistParser({ storage })
  const files = await storage.list('**/*.m3u')
  const streams = await parser.parse(files)

  // group streams by channel id; drop streams with no channel metadata
  const groups = new Map<string, Stream[]>()
  streams.forEach((stream: Stream) => {
    const channel = stream.getChannel()
    if (!channel) return
    const list = groups.get(channel.id) || []
    list.push(stream)
    groups.set(channel.id, list)
  })

  const channels: ChannelEntry[] = []
  for (const [channelId, group] of groups) {
    const channel = group[0].getChannel()!
    const sorted = group.sort(
      (a, b) => b.getVerticalResolution() - a.getVerticalResolution()
    )

    const languages = new Set<string>()
    let logo: string | null = null
    const entryStreams: StreamEntry[] = sorted.map((s: Stream) => {
      s.getLanguages().forEach((l: { code: string }) => languages.add(l.code))
      if (!logo) {
        const url = s.getTvgLogo()
        if (url) logo = url
      }
      return {
        url: s.url,
        quality: s.quality || null,
        label: s.label || null,
        userAgent: s.user_agent || null,
        referrer: s.referrer || null
      }
    })

    channels.push({
      id: channelId,
      name: channel.name,
      logo,
      categories: channel.categories || [],
      country: channel.country || null,
      languages: [...languages],
      isNsfw: channel.is_nsfw === true,
      streams: entryStreams
    })
  }

  channels.sort((a, b) => a.name.localeCompare(b.name))

  return {
    generatedAt: new Date().toISOString(),
    filters: buildFilters(channels),
    channels
  }
}

function buildFilters(channels: ChannelEntry[]): Catalog['filters'] {
  const catCount = new Map<string, number>()
  const countryCount = new Map<string, number>()
  const langCount = new Map<string, number>()

  for (const ch of channels) {
    for (const c of ch.categories) catCount.set(c, (catCount.get(c) || 0) + 1)
    if (ch.country) countryCount.set(ch.country, (countryCount.get(ch.country) || 0) + 1)
    for (const l of ch.languages) langCount.set(l, (langCount.get(l) || 0) + 1)
  }

  const categories: Facet[] = [...catCount].map(([id, count]) => ({
    id,
    name: apiData.categoriesKeyById.get(id)?.name || id,
    count
  }))

  const countries: CountryFacet[] = [...countryCount].map(([code, count]) => ({
    id: code,
    name: apiData.countriesKeyByCode.get(code)?.name || code,
    flag: countryCodeToFlag(code),
    count
  }))

  const languages: Facet[] = [...langCount].map(([code, count]) => ({
    id: code,
    name: apiData.languagesKeyByCode.get(code)?.name || code,
    count
  }))

  const byCountThenName = (a: Facet, b: Facet) =>
    b.count - a.count || a.name.localeCompare(b.name)

  return {
    categories: categories.sort(byCountThenName),
    countries: countries.sort(byCountThenName) as CountryFacet[],
    languages: languages.sort(byCountThenName)
  }
}

export async function writeCatalog(filepath: string, catalog: Catalog): Promise<void> {
  await fs.ensureDir(path.dirname(filepath))
  await fs.writeJson(filepath, catalog)
}

async function main() {
  const catalog = await buildCatalog()
  await writeCatalog(CATALOG_PATH, catalog)
  // eslint-disable-next-line no-console
  console.log(`wrote ${catalog.channels.length} channels to ${CATALOG_PATH}`)
}

// run when invoked directly (tsx sets process.argv[1] to this file)
main()
```

Note: the existing playlist commands call `main()` unconditionally at module load (see `scripts/commands/playlist/generate.ts`). The server imports `buildCatalog`/`writeCatalog` by name; to avoid the CLI `main()` running on import, split the CLI into its own file in Step 3a.

- [ ] **Step 3a: Split CLI entry from importable module**

Remove the `main()` call and `main` function from `scripts/commands/app/catalog.ts` (keep only the exported `buildCatalog`/`writeCatalog` and helpers). Create `scripts/commands/app/build.ts`:
```ts
import { buildCatalog, writeCatalog } from './catalog'

const CATALOG_PATH = process.env.CATALOG_PATH || 'app/catalog.json'

async function main() {
  const catalog = await buildCatalog()
  await writeCatalog(CATALOG_PATH, catalog)
  // eslint-disable-next-line no-console
  console.log(`wrote ${catalog.channels.length} channels to ${CATALOG_PATH}`)
}

main()
```
Update the npm script in `package.json`:
```json
"app:catalog": "tsx scripts/commands/app/build.ts",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/commands/app/catalog.test.ts`
Expected: PASS. (If the `AndorraTV.ad` assertion fails because the fixture set changed, replace it with any channel id present in `tests/__data__/input/playlist_generate/ad.m3u`; verify with `grep tvg-id tests/__data__/input/playlist_generate/ad.m3u`.)

- [ ] **Step 5: Commit**

```bash
git add scripts/commands/app/catalog.ts scripts/commands/app/build.ts tests/commands/app/catalog.test.ts package.json
git commit -m "feat(app): build catalog.json joining API metadata with repo streams"
```

---

## Task 4: Server config loader

**Files:**
- Create: `app/server/config.ts`
- Test: `tests/app/server/config.test.ts`

**Interfaces:**
- Produces: `interface AppConfig { vlcHost: string; vlcPort: number; vlcPassword: string; appPort: number; catalogPath: string }`; `function loadConfig(env?: NodeJS.ProcessEnv): AppConfig`.

- [ ] **Step 1: Write the failing test**

`tests/app/server/config.test.ts`:
```ts
import { loadConfig } from '../../../app/server/config'

describe('loadConfig', () => {
  it('applies defaults when env is empty', () => {
    const cfg = loadConfig({})
    expect(cfg).toEqual({
      vlcHost: 'localhost',
      vlcPort: 8080,
      vlcPassword: '',
      appPort: 4000,
      catalogPath: 'app/catalog.json'
    })
  })

  it('reads values from env', () => {
    const cfg = loadConfig({
      VLC_HOST: 'vlc.local',
      VLC_PORT: '9090',
      VLC_PASSWORD: 'secret',
      APP_PORT: '5000',
      CATALOG_PATH: '/tmp/c.json'
    })
    expect(cfg).toEqual({
      vlcHost: 'vlc.local',
      vlcPort: 9090,
      vlcPassword: 'secret',
      appPort: 5000,
      catalogPath: '/tmp/c.json'
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/app/server/config.test.ts`
Expected: FAIL — cannot find module `app/server/config`.

- [ ] **Step 3: Write minimal implementation**

`app/server/config.ts`:
```ts
export interface AppConfig {
  vlcHost: string
  vlcPort: number
  vlcPassword: string
  appPort: number
  catalogPath: string
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    vlcHost: env.VLC_HOST || 'localhost',
    vlcPort: Number(env.VLC_PORT) || 8080,
    vlcPassword: env.VLC_PASSWORD ?? '',
    appPort: Number(env.APP_PORT) || 4000,
    catalogPath: env.CATALOG_PATH || 'app/catalog.json'
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/app/server/config.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/server/config.ts tests/app/server/config.test.ts
git commit -m "feat(app): add server config loader"
```

---

## Task 5: VLC HTTP client

**Files:**
- Create: `app/server/vlc.ts`
- Test: `tests/app/server/vlc.test.ts`

**Interfaces:**
- Consumes: `axios` (already a dependency).
- Produces:
  - `type VlcState = 'playing' | 'paused' | 'stopped' | 'unknown'`
  - `interface VlcStatus { state: VlcState; volume: number }`
  - `class VlcError extends Error { code: 'vlc_unreachable' | 'vlc_auth' | 'vlc_error' }`
  - `class VlcClient { constructor(cfg: { host: string; port: number; password: string }); play(input: { url: string; userAgent?: string | null; referrer?: string | null }): Promise<void>; pause(): Promise<void>; stop(): Promise<void>; setVolume(value: number): Promise<void>; getStatus(): Promise<VlcStatus> }`

- [ ] **Step 1: Write the failing test**

`tests/app/server/vlc.test.ts`:
```ts
import http from 'node:http'
import { AddressInfo } from 'node:net'
import { VlcClient, VlcError } from '../../../app/server/vlc'

const STATUS_XML = '<root><state>playing</state><volume>256</volume></root>'

function startFakeVlc(handler: (req: http.IncomingMessage, res: http.ServerResponse) => void) {
  const server = http.createServer(handler)
  return new Promise<{ server: http.Server; port: number }>(resolve => {
    server.listen(0, () => resolve({ server, port: (server.address() as AddressInfo).port }))
  })
}

describe('VlcClient', () => {
  it('sends in_play with encoded input and per-input header options', async () => {
    let capturedUrl = ''
    let capturedAuth = ''
    const { server, port } = await startFakeVlc((req, res) => {
      capturedUrl = req.url || ''
      capturedAuth = req.headers.authorization || ''
      res.end(STATUS_XML)
    })
    const client = new VlcClient({ host: 'localhost', port, password: 'pw' })
    await client.play({
      url: 'https://ex.com/a.m3u8',
      userAgent: 'Moz/5',
      referrer: 'https://ref'
    })
    server.close()

    expect(capturedUrl).toContain('command=in_play')
    expect(capturedUrl).toContain('input=https%3A%2F%2Fex.com%2Fa.m3u8')
    expect(capturedUrl).toContain('option=%3Ahttp-user-agent%3DMoz%2F5')
    expect(capturedUrl).toContain('option=%3Ahttp-referrer%3Dhttps%3A%2F%2Fref')
    expect(capturedAuth).toMatch(/^Basic /)
  })

  it('parses status', async () => {
    const { server, port } = await startFakeVlc((_req, res) => res.end(STATUS_XML))
    const client = new VlcClient({ host: 'localhost', port, password: 'pw' })
    const status = await client.getStatus()
    server.close()
    expect(status).toEqual({ state: 'playing', volume: 256 })
  })

  it('maps 401 to vlc_auth', async () => {
    const { server, port } = await startFakeVlc((_req, res) => {
      res.statusCode = 401
      res.end('unauthorized')
    })
    const client = new VlcClient({ host: 'localhost', port, password: 'wrong' })
    await expect(client.getStatus()).rejects.toMatchObject({ code: 'vlc_auth' })
    server.close()
  })

  it('maps connection refused to vlc_unreachable', async () => {
    // port 1 is not listening
    const client = new VlcClient({ host: 'localhost', port: 1, password: 'pw' })
    await expect(client.getStatus()).rejects.toMatchObject({ code: 'vlc_unreachable' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/app/server/vlc.test.ts`
Expected: FAIL — cannot find module `app/server/vlc`.

- [ ] **Step 3: Write minimal implementation**

`app/server/vlc.ts`:
```ts
import axios, { AxiosInstance } from 'axios'

export type VlcState = 'playing' | 'paused' | 'stopped' | 'unknown'

export interface VlcStatus {
  state: VlcState
  volume: number
}

export type VlcErrorCode = 'vlc_unreachable' | 'vlc_auth' | 'vlc_error'

export class VlcError extends Error {
  constructor(public code: VlcErrorCode, message: string) {
    super(message)
    this.name = 'VlcError'
  }
}

export class VlcClient {
  private http: AxiosInstance

  constructor(cfg: { host: string; port: number; password: string }) {
    this.http = axios.create({
      baseURL: `http://${cfg.host}:${cfg.port}`,
      auth: { username: '', password: cfg.password },
      timeout: 5000,
      responseType: 'text'
    })
  }

  private async request(qs: URLSearchParams): Promise<string> {
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    try {
      const res = await this.http.get(`/requests/status.xml${suffix}`)
      return String(res.data)
    } catch (err) {
      throw this.mapError(err)
    }
  }

  private mapError(err: unknown): VlcError {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 401) {
        return new VlcError('vlc_auth', 'VLC rejected the password')
      }
      const code = err.code || ''
      if (['ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENOTFOUND', 'ECONNRESET'].includes(code)) {
        return new VlcError('vlc_unreachable', 'Cannot reach VLC')
      }
    }
    return new VlcError('vlc_error', 'VLC request failed')
  }

  async play(input: { url: string; userAgent?: string | null; referrer?: string | null }): Promise<void> {
    const qs = new URLSearchParams({ command: 'in_play', input: input.url })
    if (input.userAgent) qs.append('option', `:http-user-agent=${input.userAgent}`)
    if (input.referrer) qs.append('option', `:http-referrer=${input.referrer}`)
    await this.request(qs)
  }

  async pause(): Promise<void> {
    await this.request(new URLSearchParams({ command: 'pl_pause' }))
  }

  async stop(): Promise<void> {
    await this.request(new URLSearchParams({ command: 'pl_stop' }))
  }

  async setVolume(value: number): Promise<void> {
    const clamped = Math.max(0, Math.min(320, Math.round(value)))
    await this.request(new URLSearchParams({ command: 'volume', val: String(clamped) }))
  }

  async getStatus(): Promise<VlcStatus> {
    const xml = await this.request(new URLSearchParams())
    const rawState = xml.match(/<state>(.*?)<\/state>/)?.[1] ?? 'unknown'
    const volume = Number(xml.match(/<volume>(\d+)<\/volume>/)?.[1] ?? 0)
    const state: VlcState = (['playing', 'paused', 'stopped'] as const).includes(
      rawState as VlcState
    )
      ? (rawState as VlcState)
      : 'unknown'
    return { state, volume }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/app/server/vlc.test.ts`
Expected: PASS (all four cases).

- [ ] **Step 5: Commit**

```bash
git add app/server/vlc.ts tests/app/server/vlc.test.ts
git commit -m "feat(app): add VLC HTTP client with error mapping"
```

---

## Task 6: Express helper server

**Files:**
- Create: `app/server/index.ts`
- Test: `tests/app/server/index.test.ts`

**Interfaces:**
- Consumes: `loadConfig` (Task 4); `VlcClient`, `VlcError` (Task 5); `buildCatalog`, `writeCatalog` (Task 3).
- Produces:
  - `function createApp(deps: { vlc: Pick<VlcClient, 'play' | 'pause' | 'stop' | 'setVolume' | 'getStatus'>; catalogPath: string }): express.Express`
  - `async function ensureCatalog(catalogPath: string): Promise<void>`

- [ ] **Step 1: Write the failing test**

`tests/app/server/index.test.ts`:
```ts
import request from 'supertest'
import * as fs from 'fs-extra'
import { createApp } from '../../../app/server/index'
import { VlcError } from '../../../app/server/vlc'

const CATALOG = 'tests/__data__/output/catalog.json'

function makeVlc(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    play: overrides.play || jest.fn().mockResolvedValue(undefined),
    pause: overrides.pause || jest.fn().mockResolvedValue(undefined),
    stop: overrides.stop || jest.fn().mockResolvedValue(undefined),
    setVolume: overrides.setVolume || jest.fn().mockResolvedValue(undefined),
    getStatus: overrides.getStatus || jest.fn().mockResolvedValue({ state: 'playing', volume: 256 })
  }
}

beforeEach(() => {
  fs.emptyDirSync('tests/__data__/output')
  fs.writeJsonSync(CATALOG, { generatedAt: 'x', filters: { categories: [], countries: [], languages: [] }, channels: [] })
})

describe('createApp', () => {
  it('serves the catalog file', async () => {
    const app = createApp({ vlc: makeVlc(), catalogPath: CATALOG })
    const res = await request(app).get('/api/catalog')
    expect(res.status).toBe(200)
    expect(res.body.channels).toEqual([])
  })

  it('relays play and returns ok', async () => {
    const play = jest.fn().mockResolvedValue(undefined)
    const app = createApp({ vlc: makeVlc({ play }), catalogPath: CATALOG })
    const res = await request(app).post('/api/play').send({ url: 'https://ex/a.m3u8' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(play).toHaveBeenCalledWith({ url: 'https://ex/a.m3u8' })
  })

  it('maps VlcError to 502 with error code', async () => {
    const getStatus = jest.fn().mockRejectedValue(new VlcError('vlc_unreachable', 'no vlc'))
    const app = createApp({ vlc: makeVlc({ getStatus }), catalogPath: CATALOG })
    const res = await request(app).get('/api/status')
    expect(res.status).toBe(502)
    expect(res.body).toEqual({ error: 'vlc_unreachable' })
  })

  it('returns status payload', async () => {
    const app = createApp({ vlc: makeVlc(), catalogPath: CATALOG })
    const res = await request(app).get('/api/status')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ state: 'playing', volume: 256 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/app/server/index.test.ts`
Expected: FAIL — cannot find module `app/server/index`.

- [ ] **Step 3: Write minimal implementation**

`app/server/index.ts`:
```ts
import express from 'express'
import * as fs from 'fs-extra'
import path from 'node:path'
import { loadConfig } from './config'
import { VlcClient, VlcError } from './vlc'
import { buildCatalog, writeCatalog } from '../../scripts/commands/app/catalog'

type VlcLike = Pick<VlcClient, 'play' | 'pause' | 'stop' | 'setVolume' | 'getStatus'>

async function handle(res: express.Response, fn: () => Promise<unknown>, returnData = false) {
  try {
    const out = await fn()
    res.json(returnData ? out : { ok: true })
  } catch (err) {
    if (err instanceof VlcError) {
      res.status(502).json({ error: err.code })
      return
    }
    res.status(500).json({ error: 'internal' })
  }
}

export function createApp(deps: { vlc: VlcLike; catalogPath: string }): express.Express {
  const app = express()
  app.use(express.json())

  app.get('/api/catalog', async (_req, res) => {
    try {
      const raw = await fs.readFile(deps.catalogPath, 'utf8')
      res.type('application/json').send(raw)
    } catch {
      res.status(500).json({ error: 'catalog_unavailable' })
    }
  })

  app.post('/api/play', (req, res) => handle(res, () => deps.vlc.play(req.body)))
  app.post('/api/pause', (_req, res) => handle(res, () => deps.vlc.pause()))
  app.post('/api/stop', (_req, res) => handle(res, () => deps.vlc.stop()))
  app.post('/api/volume', (req, res) => handle(res, () => deps.vlc.setVolume(Number(req.body.value))))
  app.get('/api/status', (_req, res) => handle(res, () => deps.vlc.getStatus(), true))

  const dist = path.resolve('app/web/dist')
  app.use(express.static(dist))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'), err => {
      if (err) res.status(404).send('Not found. Run `npm run app:build` first.')
    })
  })

  return app
}

export async function ensureCatalog(catalogPath: string): Promise<void> {
  if (await fs.pathExists(catalogPath)) return
  // eslint-disable-next-line no-console
  console.log('catalog.json missing — building it (first run)...')
  const catalog = await buildCatalog()
  await writeCatalog(catalogPath, catalog)
}

async function main() {
  const cfg = loadConfig()
  await ensureCatalog(cfg.catalogPath)
  const vlc = new VlcClient({ host: cfg.vlcHost, port: cfg.vlcPort, password: cfg.vlcPassword })
  const app = createApp({ vlc, catalogPath: cfg.catalogPath })
  app.listen(cfg.appPort, () => {
    // eslint-disable-next-line no-console
    console.log(`channel browser on http://localhost:${cfg.appPort}`)
  })
}

if (process.argv[1] && process.argv[1].endsWith(path.join('app', 'server', 'index.ts'))) {
  main()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/app/server/index.test.ts`
Expected: PASS (all four cases).

- [ ] **Step 5: Commit**

```bash
git add app/server/index.ts tests/app/server/index.test.ts
git commit -m "feat(app): add express server with catalog + VLC relay routes"
```

---

## Task 7: SPA entry, types, and API client

**Files:**
- Create: `app/web/index.html`
- Create: `app/web/src/main.tsx`
- Create: `app/web/src/lib/types.ts`
- Create: `app/web/src/lib/apiClient.ts`
- Create: `app/web/src/styles.css`
- Test: `app/web/src/lib/apiClient.test.ts`

**Interfaces:**
- Consumes: shared types from `app/shared/catalog`.
- Produces:
  - `interface FilterState { categories: string[]; countries: string[]; languages: string[]; search: string; hideAdult: boolean }`, `const EMPTY_FILTERS: FilterState`.
  - `const api = { getCatalog(): Promise<Catalog>; play(input): Promise<void>; pause(): Promise<void>; stop(): Promise<void>; setVolume(value: number): Promise<void>; getStatus(): Promise<VlcStatus> }`
  - `type VlcStatus = { state: string; volume: number }`; `class ApiError extends Error { code: string }`.

- [ ] **Step 1: Write the failing test**

`app/web/src/lib/apiClient.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api, ApiError } from './apiClient'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('api.play', () => {
  it('POSTs to /api/play with the stream body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    vi.stubGlobal('fetch', fetchMock)
    await api.play({ url: 'https://ex/a.m3u8', userAgent: null, referrer: null })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/play',
      expect.objectContaining({ method: 'POST' })
    )
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.url).toBe('https://ex/a.m3u8')
  })

  it('throws ApiError with the server error code on 502', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: 'vlc_unreachable' })
    }))
    await expect(api.getStatus()).rejects.toMatchObject({ code: 'vlc_unreachable' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run app:test:web -- apiClient`
Expected: FAIL — cannot resolve `./apiClient`.

- [ ] **Step 3: Write minimal implementation**

`app/web/src/lib/types.ts`:
```ts
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
```

`app/web/src/lib/apiClient.ts`:
```ts
import type { Catalog, StreamEntry } from './types'

export interface VlcStatus {
  state: string
  volume: number
}

export class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function post(path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  return unwrap(res)
}

async function unwrap(res: Response): Promise<unknown> {
  if (!res.ok) {
    let code = 'request_failed'
    try {
      const data = (await res.json()) as { error?: string }
      if (data.error) code = data.error
    } catch {
      // ignore non-JSON error bodies
    }
    throw new ApiError(code, `Request failed (${res.status})`)
  }
  return res.json()
}

export type PlayInput = Pick<StreamEntry, 'url' | 'userAgent' | 'referrer'>

export const api = {
  async getCatalog(): Promise<Catalog> {
    const res = await fetch('/api/catalog')
    return unwrap(res) as Promise<Catalog>
  },
  async play(input: PlayInput): Promise<void> {
    await post('/api/play', input)
  },
  async pause(): Promise<void> {
    await post('/api/pause')
  },
  async stop(): Promise<void> {
    await post('/api/stop')
  },
  async setVolume(value: number): Promise<void> {
    await post('/api/volume', { value })
  },
  async getStatus(): Promise<VlcStatus> {
    const res = await fetch('/api/status')
    return unwrap(res) as Promise<VlcStatus>
  }
}
```

`app/web/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>IPTV Channel Browser</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`app/web/src/main.tsx`:
```tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

`app/web/src/styles.css`:
```css
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: #12141a; color: #e8eaed; }
.app { display: grid; grid-template-columns: 260px 1fr; grid-template-rows: 1fr auto; height: 100vh; }
.sidebar { grid-row: 1 / 2; overflow-y: auto; padding: 12px; border-right: 1px solid #2a2d36; }
.main { grid-row: 1 / 2; display: flex; flex-direction: column; overflow: hidden; }
.searchbar { padding: 12px; }
.searchbar input { width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid #2a2d36; background: #1b1e26; color: inherit; }
.grid { flex: 1; overflow-y: auto; padding: 12px; }
.card { display: flex; gap: 8px; align-items: center; padding: 8px; border-radius: 8px; cursor: pointer; }
.card:hover { background: #1b1e26; }
.card img, .card .logo-fallback { width: 48px; height: 48px; object-fit: contain; border-radius: 6px; background: #1b1e26; display: flex; align-items: center; justify-content: center; font-weight: 600; }
.badge { font-size: 11px; padding: 1px 6px; border-radius: 999px; background: #2a2d36; margin-left: 4px; }
.nowplaying { grid-column: 1 / 3; grid-row: 2 / 3; display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-top: 1px solid #2a2d36; background: #1b1e26; }
.banner { grid-column: 1 / 3; padding: 8px 16px; background: #7a2020; color: #fff; }
.facet { margin-bottom: 16px; }
.facet h4 { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #9aa0aa; }
.facet label { display: flex; gap: 6px; align-items: center; font-size: 13px; padding: 2px 0; cursor: pointer; }
button { cursor: pointer; background: #2a2d36; color: inherit; border: none; border-radius: 6px; padding: 6px 10px; }
button:hover { background: #363a45; }
```

(`App.tsx` is created in Task 11; add a temporary stub so the app compiles now.)

`app/web/src/App.tsx` (temporary stub, replaced in Task 11):
```tsx
export default function App() {
  return <div>Loading…</div>
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run app:test:web -- apiClient`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/web/index.html app/web/src/main.tsx app/web/src/App.tsx app/web/src/styles.css app/web/src/lib/types.ts app/web/src/lib/apiClient.ts app/web/src/lib/apiClient.test.ts
git commit -m "feat(app): add SPA entry, shared types, and API client"
```

---

## Task 8: Pure filtering logic

**Files:**
- Create: `app/web/src/lib/filtering.ts`
- Test: `app/web/src/lib/filtering.test.ts`

**Interfaces:**
- Consumes: `ChannelEntry`, `FilterState` from `./types`.
- Produces: `function filterChannels(channels: ChannelEntry[], filters: FilterState): ChannelEntry[]`.

Semantics (from spec): within a facet = OR; across facets = AND; search = case-insensitive substring on `name`; `hideAdult` removes `isNsfw` channels.

- [ ] **Step 1: Write the failing test**

`app/web/src/lib/filtering.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run app:test:web -- filtering`
Expected: FAIL — cannot resolve `./filtering`.

- [ ] **Step 3: Write minimal implementation**

`app/web/src/lib/filtering.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run app:test:web -- filtering`
Expected: PASS (all six cases).

- [ ] **Step 5: Commit**

```bash
git add app/web/src/lib/filtering.ts app/web/src/lib/filtering.test.ts
git commit -m "feat(app): add pure channel filtering logic"
```

---

## Task 9: Data + VLC hooks

**Files:**
- Create: `app/web/src/hooks/useCatalog.ts`
- Create: `app/web/src/hooks/useVlc.ts`
- Test: `app/web/src/hooks/useCatalog.test.ts`
- Test: `app/web/src/hooks/useVlc.test.ts`

**Interfaces:**
- Consumes: `api`, `ApiError`, `VlcStatus` from `../lib/apiClient`; `Catalog` from `../lib/types`.
- Produces:
  - `function useCatalog(): { catalog: Catalog | null; loading: boolean; error: string | null }`
  - `function useVlc(): { status: VlcStatus | null; error: string | null; play(input): Promise<void>; pause(): Promise<void>; stop(): Promise<void>; setVolume(v: number): Promise<void> }` — polls `getStatus` every 2000ms; captures `ApiError.code` into `error`.

- [ ] **Step 1: Write the failing tests**

`app/web/src/hooks/useCatalog.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCatalog } from './useCatalog'

beforeEach(() => vi.restoreAllMocks())

const catalog = { generatedAt: 'x', filters: { categories: [], countries: [], languages: [] }, channels: [] }

describe('useCatalog', () => {
  it('loads the catalog', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => catalog }))
    const { result } = renderHook(() => useCatalog())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.catalog).toEqual(catalog)
    expect(result.current.error).toBeNull()
  })

  it('captures errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'catalog_unavailable' }) }))
    const { result } = renderHook(() => useCatalog())
    await waitFor(() => expect(result.current.error).toBe('catalog_unavailable'))
  })
})
```

`app/web/src/hooks/useVlc.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useVlc } from './useVlc'
import { api } from '../lib/apiClient'

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'getStatus').mockResolvedValue({ state: 'stopped', volume: 256 })
})
afterEach(() => vi.useRealTimers())

describe('useVlc', () => {
  it('polls status on mount', async () => {
    const { result } = renderHook(() => useVlc())
    await waitFor(() => expect(result.current.status).toEqual({ state: 'stopped', volume: 256 }))
  })

  it('play delegates to api.play', async () => {
    const play = vi.spyOn(api, 'play').mockResolvedValue()
    const { result } = renderHook(() => useVlc())
    await act(async () => {
      await result.current.play({ url: 'u', userAgent: null, referrer: null })
    })
    expect(play).toHaveBeenCalledWith({ url: 'u', userAgent: null, referrer: null })
  })

  it('records vlc error code from a failed command', async () => {
    vi.spyOn(api, 'play').mockRejectedValue(Object.assign(new Error('x'), { code: 'vlc_unreachable', name: 'ApiError' }))
    const { result } = renderHook(() => useVlc())
    await act(async () => {
      await result.current.play({ url: 'u', userAgent: null, referrer: null }).catch(() => {})
    })
    await waitFor(() => expect(result.current.error).toBe('vlc_unreachable'))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run app:test:web -- hooks`
Expected: FAIL — cannot resolve `./useCatalog` / `./useVlc`.

- [ ] **Step 3: Write minimal implementations**

`app/web/src/hooks/useCatalog.ts`:
```ts
import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/apiClient'
import type { Catalog } from '../lib/types'

export function useCatalog(): { catalog: Catalog | null; loading: boolean; error: string | null } {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    api
      .getCatalog()
      .then(c => {
        if (active) setCatalog(c)
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof ApiError ? e.code : 'load_failed')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { catalog, loading, error }
}
```

`app/web/src/hooks/useVlc.ts`:
```ts
import { useCallback, useEffect, useState } from 'react'
import { api, ApiError, PlayInput, VlcStatus } from '../lib/apiClient'

const POLL_MS = 2000

export function useVlc() {
  const [status, setStatus] = useState<VlcStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const capture = useCallback((e: unknown) => {
    setError(e instanceof ApiError ? e.code : 'request_failed')
  }, [])

  useEffect(() => {
    let active = true
    const poll = () => {
      api
        .getStatus()
        .then(s => {
          if (!active) return
          setStatus(s)
          setError(null)
        })
        .catch(capture)
    }
    poll()
    const id = setInterval(poll, POLL_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [capture])

  const play = useCallback(
    async (input: PlayInput) => {
      try {
        await api.play(input)
        setError(null)
      } catch (e) {
        capture(e)
        throw e
      }
    },
    [capture]
  )
  const pause = useCallback(() => api.pause().catch(capture), [capture])
  const stop = useCallback(() => api.stop().catch(capture), [capture])
  const setVolume = useCallback((v: number) => api.setVolume(v).catch(capture), [capture])

  return { status, error, play, pause, stop, setVolume }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run app:test:web -- hooks`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/web/src/hooks
git commit -m "feat(app): add useCatalog and useVlc hooks"
```

---

## Task 10: Presentational components (sidebar, search, now-playing, banner)

**Files:**
- Create: `app/web/src/components/FilterSidebar.tsx`
- Create: `app/web/src/components/SearchBar.tsx`
- Create: `app/web/src/components/NowPlayingBar.tsx`
- Create: `app/web/src/components/ErrorBanner.tsx`
- Test: `app/web/src/components/FilterSidebar.test.tsx`
- Test: `app/web/src/components/NowPlayingBar.test.tsx`

**Interfaces:**
- Consumes: `Catalog`, `FilterState`, `Facet`, `CountryFacet` from `../lib/types`; `VlcStatus` from `../lib/apiClient`.
- Produces:
  - `FilterSidebar({ filters, catalogFilters, onChange }: { filters: FilterState; catalogFilters: Catalog['filters']; onChange(next: FilterState): void })`
  - `SearchBar({ value, onChange }: { value: string; onChange(v: string): void })`
  - `NowPlayingBar({ channelName, status, onPause, onStop, onVolume }: { channelName: string | null; status: VlcStatus | null; onPause(): void; onStop(): void; onVolume(v: number): void })`
  - `ErrorBanner({ code, onDismiss }: { code: string | null; onDismiss(): void })`

- [ ] **Step 1: Write the failing tests**

`app/web/src/components/FilterSidebar.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterSidebar } from './FilterSidebar'
import { EMPTY_FILTERS } from '../lib/types'

const catalogFilters = {
  categories: [{ id: 'news', name: 'News', count: 2 }],
  countries: [{ id: 'US', name: 'United States', flag: '🇺🇸', count: 5 }],
  languages: [{ id: 'eng', name: 'English', count: 9 }]
}

describe('FilterSidebar', () => {
  it('toggles a category on click', async () => {
    const onChange = vi.fn()
    render(<FilterSidebar filters={EMPTY_FILTERS} catalogFilters={catalogFilters} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText(/News/))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ categories: ['news'] }))
  })

  it('toggles hide-adult', async () => {
    const onChange = vi.fn()
    render(<FilterSidebar filters={EMPTY_FILTERS} catalogFilters={catalogFilters} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText(/Hide adult/i))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hideAdult: true }))
  })
})
```

`app/web/src/components/NowPlayingBar.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NowPlayingBar } from './NowPlayingBar'

describe('NowPlayingBar', () => {
  it('shows the channel name and fires stop', async () => {
    const onStop = vi.fn()
    render(
      <NowPlayingBar channelName="BBC News" status={{ state: 'playing', volume: 256 }}
        onPause={() => {}} onStop={onStop} onVolume={() => {}} />
    )
    expect(screen.getByText(/BBC News/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /stop/i }))
    expect(onStop).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run app:test:web -- components`
Expected: FAIL — cannot resolve the component modules.

- [ ] **Step 3: Write minimal implementations**

`app/web/src/components/FilterSidebar.tsx`:
```tsx
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
    <div className="facet" key={axis}>
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
```

`app/web/src/components/SearchBar.tsx`:
```tsx
export function SearchBar({ value, onChange }: { value: string; onChange(v: string): void }) {
  return (
    <div className="searchbar">
      <input
        type="search"
        placeholder="Search channels…"
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label="Search channels"
      />
    </div>
  )
}
```

`app/web/src/components/NowPlayingBar.tsx`:
```tsx
import type { VlcStatus } from '../lib/apiClient'

export function NowPlayingBar({
  channelName,
  status,
  onPause,
  onStop,
  onVolume
}: {
  channelName: string | null
  status: VlcStatus | null
  onPause(): void
  onStop(): void
  onVolume(v: number): void
}) {
  return (
    <footer className="nowplaying">
      <span>▶ {channelName ? channelName : 'Nothing playing'}</span>
      {status && <span className="badge">{status.state}</span>}
      <button onClick={onPause} aria-label="Pause">⏸</button>
      <button onClick={onStop} aria-label="Stop">⏹</button>
      <label>
        🔊
        <input
          type="range"
          min={0}
          max={320}
          value={status?.volume ?? 256}
          onChange={e => onVolume(Number(e.target.value))}
          aria-label="Volume"
        />
      </label>
    </footer>
  )
}
```

`app/web/src/components/ErrorBanner.tsx`:
```tsx
const MESSAGES: Record<string, string> = {
  vlc_unreachable: "Can't reach VLC — is it running with the web interface enabled? See app/README.md.",
  vlc_auth: 'VLC rejected the password — check VLC_PASSWORD in your .env.',
  catalog_unavailable: 'Catalog is unavailable. Try `npm run app:catalog`.',
  load_failed: 'Failed to load the catalog.'
}

export function ErrorBanner({ code, onDismiss }: { code: string | null; onDismiss(): void }) {
  if (!code) return null
  return (
    <div className="banner" role="alert">
      {MESSAGES[code] || `Error: ${code}`}
      <button onClick={onDismiss} aria-label="Dismiss" style={{ marginLeft: 12 }}>✕</button>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run app:test:web -- components`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/web/src/components/FilterSidebar.tsx app/web/src/components/SearchBar.tsx app/web/src/components/NowPlayingBar.tsx app/web/src/components/ErrorBanner.tsx app/web/src/components/FilterSidebar.test.tsx app/web/src/components/NowPlayingBar.test.tsx
git commit -m "feat(app): add sidebar, search, now-playing, and error banner components"
```

---

## Task 11: Channel grid (virtualized) + App composition with URL state

**Files:**
- Create: `app/web/src/components/ChannelCard.tsx`
- Create: `app/web/src/components/ChannelGrid.tsx`
- Create: `app/web/src/lib/url.ts`
- Modify: `app/web/src/App.tsx` (replace the Task 7 stub)
- Test: `app/web/src/components/ChannelCard.test.tsx`
- Test: `app/web/src/lib/url.test.ts`

**Interfaces:**
- Consumes: `filterChannels` (Task 8); `useCatalog`, `useVlc` (Task 9); all Task 10 components; `ChannelEntry`, `StreamEntry`, `FilterState`, `EMPTY_FILTERS` from `../lib/types`.
- Produces:
  - `ChannelCard({ channel, onPlay }: { channel: ChannelEntry; onPlay(stream: StreamEntry, channel: ChannelEntry): void })`
  - `ChannelGrid({ channels, onPlay }: { channels: ChannelEntry[]; onPlay(stream: StreamEntry, channel: ChannelEntry): void })`
  - `filtersToQuery(f: FilterState): string`, `queryToFilters(q: string): FilterState` in `lib/url.ts`.

- [ ] **Step 1: Write the failing tests**

`app/web/src/lib/url.test.ts`:
```ts
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
```

`app/web/src/components/ChannelCard.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChannelCard } from './ChannelCard'
import type { ChannelEntry } from '../lib/types'

const twoStream: ChannelEntry = {
  id: 'a', name: 'BBC News', logo: null, categories: ['news'], country: 'GB',
  languages: ['eng'], isNsfw: false,
  streams: [
    { url: 'hd', quality: '1080p', label: null, userAgent: null, referrer: null },
    { url: 'sd', quality: '480p', label: null, userAgent: null, referrer: null }
  ]
}

describe('ChannelCard', () => {
  it('plays the first (best) stream when the card is clicked', async () => {
    const onPlay = vi.fn()
    render(<ChannelCard channel={twoStream} onPlay={onPlay} />)
    await userEvent.click(screen.getByText('BBC News'))
    expect(onPlay).toHaveBeenCalledWith(twoStream.streams[0], twoStream)
  })

  it('shows a quality picker for multi-stream channels', () => {
    render(<ChannelCard channel={twoStream} onPlay={vi.fn()} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('480p')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run app:test:web -- "url|ChannelCard"`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write minimal implementations**

`app/web/src/lib/url.ts`:
```ts
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
```

`app/web/src/components/ChannelCard.tsx`:
```tsx
import { useState } from 'react'
import type { ChannelEntry, StreamEntry } from '../lib/types'

export function ChannelCard({
  channel,
  onPlay
}: {
  channel: ChannelEntry
  onPlay(stream: StreamEntry, channel: ChannelEntry): void
}) {
  const [index, setIndex] = useState(0)
  const stream = channel.streams[index] || channel.streams[0]
  const initials = channel.name.slice(0, 2).toUpperCase()

  return (
    <div className="card" onClick={() => onPlay(stream, channel)}>
      {channel.logo ? (
        <img src={channel.logo} alt="" loading="lazy" />
      ) : (
        <div className="logo-fallback">{initials}</div>
      )}
      <div style={{ flex: 1 }}>
        <div>{channel.name}</div>
        <small>
          {channel.categories.map(c => (
            <span className="badge" key={c}>{c}</span>
          ))}
          {stream.quality && <span className="badge">{stream.quality}</span>}
          {stream.label && <span className="badge">{stream.label}</span>}
        </small>
      </div>
      {channel.streams.length > 1 && (
        <select
          aria-label={`Quality for ${channel.name}`}
          value={index}
          onClick={e => e.stopPropagation()}
          onChange={e => setIndex(Number(e.target.value))}
        >
          {channel.streams.map((s, i) => (
            <option key={i} value={i}>{s.quality || `Source ${i + 1}`}</option>
          ))}
        </select>
      )}
    </div>
  )
}
```

`app/web/src/components/ChannelGrid.tsx`:
```tsx
import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { ChannelEntry, StreamEntry } from '../lib/types'
import { ChannelCard } from './ChannelCard'

export function ChannelGrid({
  channels,
  onPlay
}: {
  channels: ChannelEntry[]
  onPlay(stream: StreamEntry, channel: ChannelEntry): void
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: channels.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 68,
    overscan: 10
  })

  return (
    <div className="grid" ref={parentRef}>
      <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map(v => (
          <div
            key={channels[v.index].id}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${v.start}px)` }}
          >
            <ChannelCard channel={channels[v.index]} onPlay={onPlay} />
          </div>
        ))}
      </div>
      {channels.length === 0 && <p>No channels match these filters.</p>}
    </div>
  )
}
```

`app/web/src/App.tsx` (replace stub):
```tsx
import { useEffect, useMemo, useState } from 'react'
import { useCatalog } from './hooks/useCatalog'
import { useVlc } from './hooks/useVlc'
import { filterChannels } from './lib/filtering'
import { filtersToQuery, queryToFilters } from './lib/url'
import type { ChannelEntry, FilterState, StreamEntry } from './lib/types'
import { FilterSidebar } from './components/FilterSidebar'
import { SearchBar } from './components/SearchBar'
import { ChannelGrid } from './components/ChannelGrid'
import { NowPlayingBar } from './components/NowPlayingBar'
import { ErrorBanner } from './components/ErrorBanner'

export default function App() {
  const { catalog, loading, error: catalogError } = useCatalog()
  const { status, error: vlcError, play, pause, stop, setVolume } = useVlc()
  const [filters, setFilters] = useState<FilterState>(() => queryToFilters(window.location.search.slice(1)))
  const [nowPlaying, setNowPlaying] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const q = filtersToQuery(filters)
    const url = q ? `?${q}` : window.location.pathname
    window.history.replaceState(null, '', url)
  }, [filters])

  const visible = useMemo(
    () => (catalog ? filterChannels(catalog.channels, filters) : []),
    [catalog, filters]
  )

  const onPlay = (stream: StreamEntry, channel: ChannelEntry) => {
    setNowPlaying(channel.name)
    setDismissed(false)
    void play({ url: stream.url, userAgent: stream.userAgent, referrer: stream.referrer }).catch(() => {})
  }

  const activeError = dismissed ? null : catalogError || vlcError

  if (loading) return <div className="app"><p style={{ padding: 24 }}>Loading catalog…</p></div>

  return (
    <div className="app">
      <ErrorBanner code={activeError} onDismiss={() => setDismissed(true)} />
      {catalog && (
        <FilterSidebar filters={filters} catalogFilters={catalog.filters} onChange={setFilters} />
      )}
      <div className="main">
        <SearchBar value={filters.search} onChange={s => setFilters({ ...filters, search: s })} />
        <ChannelGrid channels={visible} onPlay={onPlay} />
      </div>
      <NowPlayingBar
        channelName={nowPlaying}
        status={status}
        onPause={pause}
        onStop={() => {
          setNowPlaying(null)
          void stop()
        }}
        onVolume={setVolume}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run app:test:web`
Expected: PASS (entire web suite green).

- [ ] **Step 5: Verify production build compiles**

Run: `npm run app:build`
Expected: Vite writes `app/web/dist/index.html` and assets with no type errors.

- [ ] **Step 6: Commit**

```bash
git add app/web/src/components/ChannelCard.tsx app/web/src/components/ChannelGrid.tsx app/web/src/lib/url.ts app/web/src/lib/url.test.ts app/web/src/components/ChannelCard.test.tsx app/web/src/App.tsx
git commit -m "feat(app): add virtualized channel grid and app composition with URL state"
```

---

## Task 12: Docs, env example finalization, and end-to-end verification

**Files:**
- Create: `app/README.md`
- Modify: `README.md` (add a short pointer to the app)

**Interfaces:**
- Consumes: everything above.
- Produces: run instructions; no new code interfaces.

- [ ] **Step 1: Write `app/README.md`**

`app/README.md`:
```markdown
# IPTV Channel Browser

A local web app to browse the channel catalog by category, country, and language (with search) and control VLC live — click a channel and VLC plays it.

## One-time VLC setup

Enable VLC's web (HTTP) interface:

1. VLC → Preferences → show **All** settings → Interface → Main interfaces → check **Web**.
2. Interface → Main interfaces → Lua → set an **HTTP Password**.
3. Restart VLC. It now listens on `http://localhost:8080`.

(Or launch VLC from a terminal: `vlc --extraintf http --http-password <pw>`.)

## Configure

```sh
cp app/.env.example .env
# edit .env and set VLC_PASSWORD to the password you set in VLC
```

## Run

```sh
npm install            # first time only (also downloads channel data)
npm run app:build      # build the web UI
npm run app:start      # serves http://localhost:4000 (auto-builds catalog.json on first run)
```

For development with hot reload:

```sh
npm run app:dev        # Vite dev server + API server together
```

## Refresh channel data

The catalog is a snapshot. To pull the latest channels/streams:

```sh
npm run api:load       # refresh upstream data
npm run app:catalog    # rebuild app/catalog.json
```

## Troubleshooting

- **"Can't reach VLC"** — VLC isn't running or the web interface is off. Redo the setup above.
- **"VLC rejected the password"** — `VLC_PASSWORD` in `.env` doesn't match VLC's HTTP password.
- **Some streams don't play** — they may be geo-blocked or offline; the card shows `Geo-blocked` / `Not 24/7` labels where known.
```

- [ ] **Step 2: Add a pointer in the root README**

Add under the repo `README.md` "Resources" or a new short section:
```markdown
## Channel Browser (local app)

A local web UI to browse channels by category/country/language and control VLC live. See [app/README.md](app/README.md).
```

- [ ] **Step 3: Full verification — automated suites**

Run:
```bash
npm run lint
npx jest tests/app tests/commands/app
npm run app:test:web
```
Expected: lint clean; all server/catalog Jest tests pass; all Vitest tests pass.

- [ ] **Step 4: Full verification — manual end-to-end**

Do this with VLC running and configured:
```bash
cp app/.env.example .env   # set VLC_PASSWORD
npm run app:build
npm run app:start
```
Then in a browser at `http://localhost:4000`:
1. Confirm the catalog loads and the sidebar shows Category/Country/Language facets with counts.
2. Check a category (e.g. News) and confirm the grid narrows; add a country filter and confirm AND behavior.
3. Type in search and confirm instant narrowing; confirm the URL query updates.
4. Click a channel → VLC switches to it within a couple of seconds.
5. Use pause/stop/volume in the now-playing bar and confirm VLC responds.
6. Stop VLC, click a channel, and confirm the red "Can't reach VLC" banner appears.

- [ ] **Step 5: Commit**

```bash
git add app/README.md README.md
git commit -m "docs(app): add channel browser setup and usage guide"
```

---

## Self-Review

**Spec coverage:**
- Category/country/language + search, combinable → Task 8 (`filterChannels`), Task 10 (`FilterSidebar`, `SearchBar`), Task 11 (`App`). ✓
- Live VLC control (play/pause/stop/volume + now-playing) → Task 5 (`VlcClient`), Task 6 (routes), Task 9 (`useVlc`), Task 10 (`NowPlayingBar`). ✓
- API metadata joined with repo streams by stream ID → Task 3 (`buildCatalog`, groups by `getChannel().id`, reuses `PlaylistParser`). ✓
- Server auto-builds catalog on startup if missing → Task 6 (`ensureCatalog`). ✓
- `userAgent`/`referrer` carried through to VLC → Task 3 (in `StreamEntry`), Task 5 (`option` params), verified by Task 5 test. ✓
- Facets precomputed with counts → Task 3 (`buildFilters`). ✓
- `isNsfw` hide-adult toggle → Task 3 (field), Task 8 (filter), Task 10 (toggle). ✓
- Channel-centric with multi-stream quality picker → Task 11 (`ChannelCard`). ✓
- Virtualized grid → Task 11 (`ChannelGrid` + react-virtual). ✓
- URL-encoded filter state → Task 11 (`lib/url.ts`). ✓
- Error handling (vlc_unreachable / vlc_auth / catalog) with actionable messages → Task 5 (mapping), Task 6 (502 codes), Task 10 (`ErrorBanner`). ✓
- Config via env → Task 4. ✓
- Testing across Jest (builder/server) + Vitest (frontend) → every task. ✓
- Docs + one-time VLC setup → Task 12. ✓

**Placeholder scan:** No TBD/TODO; every code step contains complete code and every test step contains real assertions.

**Type consistency:** `StreamEntry` fields (`url`, `quality`, `label`, `userAgent`, `referrer`) are identical across Tasks 2, 3, 7, 11. `Catalog['filters']` shape matches between Task 2, Task 3 (`buildFilters` return), and Task 10 (`FilterSidebar`). `VlcStatus` (`state`, `volume`) matches across Tasks 5, 7, 9, 10. `PlayInput` (`url`, `userAgent`, `referrer`) is used consistently in Tasks 7, 9, 11. `createApp`/`VlcLike` method set matches `VlcClient` (Task 5) and the mocks (Task 6). No naming drift found.

**One known adjustment point:** Task 3's test asserts a specific fixture channel id (`AndorraTV.ad`); Step 4 notes how to swap it if the fixture set differs. This is intentional and documented, not a placeholder.
```
