# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A curated collection of publicly available IPTV stream links, stored as [M3U](https://en.wikipedia.org/wiki/M3U) playlists in `streams/` (one file per source, grouped for moderation convenience — **not** the public output). A TypeScript toolchain in `scripts/` validates, formats, tests, and generates the public playlists that end users consume.

No video is hosted here — only user-submitted URLs. Channel/feed metadata (names, categories, languages, logos, blocklist, EPG guides) lives in the sibling **[iptv-org/database](https://github.com/iptv-org/database)** repo and is fetched at runtime via the `@iptv-org/sdk` package; it is never hand-edited here.

## Commands

Scripts are TypeScript run via `tsx` (see `package.json`). Node.js required.

| Command | Purpose |
| --- | --- |
| `npm run api:load` | Download latest channel/stream data from iptv-org/api into `temp/data`. Runs automatically as `postinstall`. Other scripts assume this data exists. |
| `npm run playlist:format [path]` | Normalize URLs, remove duplicates/invalid IDs, sort by name/quality/label. Edits `streams/` in place. |
| `npm run playlist:validate [path]` | Check IDs and links for errors (does not test connectivity). |
| `npm run playlist:lint [path]` | M3U syntax check via `m3u-linter` (config: `m3u-linter.json`). |
| `npm run playlist:test [path] [-- --fix]` | Actually open each stream and report status. `--fix` removes broken streams locally. |
| `npm run playlist:update` | Apply approved GitHub issues (add/edit/remove) to `streams/`. |
| `npm run playlist:generate` | Build all public playlists into `.gh-pages/`. |
| `npm run playlist:export` | Emit JSON of all streams for iptv-org/api into `.api/`. |
| `npm run playlist:edit <path>` | Interactive utility for mapping streams. |
| `npm run readme:update` | Regenerate `PLAYLISTS.md`. |
| `npm run report:create` | Report on current issues. |
| `npm run lint` | ESLint over `scripts/` and `tests/`. |
| `npm test` | Jest suite (`--runInBand`). |

Run a single test: `npx jest tests/commands/playlist/format.test.ts`

The `act:*` scripts run the corresponding GitHub workflow locally via `gh act`.

## Architecture

The pipeline always follows the same shape: **load API data → parse `streams/` into `Stream` models → transform → serialize back out.**

- **`scripts/api.ts`** — Loads the iptv-org database via `@iptv-org/sdk`'s `DataManager` and exposes a singleton `data` object of lookup dictionaries (`channelsKeyById`, `feedsKeyByStreamId`, `blocklistRecordsGroupedByChannel`, `guidesGroupedByStreamId`, etc.). Nearly every command starts with `await loadData()`. Metadata is joined onto streams by **stream ID** (`<channel_id>` or `<channel_id>@<feed_id>`).
- **`scripts/models/`** — `Stream` (extends `sdk.Models.Stream`; knows its filepath, tvg-id, quality, guides, and how to parse/serialize an M3U `#EXTINF` line), `Playlist` (a collection of streams that serializes to an M3U string with `x-tvg-url`), plus `Issue`/`Discussion` wrappers around GitHub data.
- **`scripts/core/`** — `PlaylistParser` (reads `.m3u` files → `Collection<Stream>`), `StreamTester`, `DataSet` (typed accessor over issue-form fields), and markdown/table helpers.
- **`scripts/generators/`** — One generator per public grouping (countries, languages, categories, regions, cities, subdivisions, sources, and the `index*.m3u` files). `playlist:generate` orchestrates them all.
- **`scripts/commands/`** — Thin entry points wired to the npm scripts, one subdir per domain (`playlist/`, `readme/`, `api/`, `report/`).

Data models lean heavily on `@freearhey/core`'s `Collection` and `Dictionary` (chainable `map`/`filter`/`groupBy`/`keyBy`/`sortBy`/`uniqBy`) rather than raw arrays. File I/O goes through `@freearhey/storage-js`'s `Storage`.

Paths are configurable through env vars (see `scripts/constants.ts`): `STREAMS_DIR`, `DATA_DIR`, `PUBLIC_DIR` (`.gh-pages`), `API_DIR`, `LOGS_DIR`. Tests override these to point at fixtures.

## Editing streams — conventions

Each stream line must follow the [Stream Description Scheme](.github/docs/stream-description-scheme.md):

```m3u
#EXTINF:-1 tvg-id="ExampleTV.us@East",Example TV East (720p) [Geo-blocked]
https://example.com/playlist.m3u8
```

- `QUALITY` is `(720p)`, `(1080p)`, etc.; `LABEL` is `[Geo-blocked]` or `[Not 24/7]`. Titles may not contain `,`, `[`, or `]`.
- Optional per-stream headers via `#EXTVLCOPT:http-referrer=…` and `#EXTVLCOPT:http-user-agent=…`.
- Files must be UTF-8 without BOM, start with `#EXTM3U`, and use **CRLF** line endings (`EOL` constant is `\r\n`).
- Don't sort or dedupe by hand — `playlist:format` does it deterministically. Don't reject/accept links by editing metadata; validation reads from the database (blocklist, NSFW, channel existence).

## Workflows / CI

- **check** (on PR): `api:load` → `playlist:lint` → `playlist:validate`; blocks merge on errors.
- **format** (manual): adds `playlist:format` before lint/validate.
- **update** (daily 00:00 UTC): full pipeline — update from issues, lint, validate, generate, export, readme:update — then deploys to GitHub Pages.

## Tests

Jest tests in `tests/commands/` are **integration** tests: each `execSync`'s the real npm script with `cross-env STREAMS_DIR=… DATA_DIR=…` pointed at `tests/__data__/input/`, then byte-compares output against `tests/__data__/expected/`. To debug, set `DEBUG=true` to print the command and stdout. When changing generator/format output, update the corresponding `expected/` fixtures.

## `app/` — Channel Browser web app

A **separate subsystem** from the playlist toolchain (added on the `app/channel-browser` branch): a local web app to browse the catalog by category/country/language + search and control VLC live. It reuses the core data layer but is otherwise self-contained under `app/`.

**Pipeline:** `app:catalog` reuses `loadData()` + `PlaylistParser` to join API metadata with this repo's stream URLs (by stream ID) into `app/catalog.json` (a **generated artifact, gitignored**). The Express server (`app/server/`) serves that catalog + the built SPA and relays `/api/*` to VLC's HTTP interface. The React/Vite SPA (`app/web/`) holds the whole catalog in memory and filters client-side.

- **`scripts/commands/app/catalog.ts`** — `buildCatalog()`/`writeCatalog()`; groups streams by channel, carries `userAgent`/`referrer` through, precomputes facet counts, and derives a synthetic **`nsfw`** category (name "NSFW") from each channel's `is_nsfw` flag. `build.ts` is the CLI entry (`app:catalog`). Under `scripts/` → subject to the CRLF lint gate.
- **`app/server/`** — `config.ts` (`loadConfig(env)`), `vlc.ts` (`VlcClient` → VLC `requests/status.xml`, Basic auth with empty user + password, per-stream `option=:http-user-agent/referrer`, error codes `vlc_unreachable`/`vlc_auth`/`vlc_error`), `index.ts` (`createApp(deps)` with an injected `vlc`, routes registered before the static/`'/{*path}'` catch-all; `ensureCatalog()` auto-builds on first run; binds `127.0.0.1`). Loads env from `app/.env` then root `.env` via `dotenv`.
- **`app/web/`** — `lib/filtering.ts` (pure `filterChannels`: OR within a facet, AND across), `lib/apiClient.ts`, `hooks/` (`useCatalog`, `useVlc` — 2s status poll), `components/` (FilterSidebar with alphabetical + collapsible facets, ChannelGrid virtualized via `@tanstack/react-virtual`, NowPlayingBar, etc.). Filter state is serialized to the URL.

**Commands:** `app:catalog` (build data), `app:dev` (Vite + server, hot reload), `app:build` (production SPA), `app:start` (serve; auto-builds catalog if missing), `app:test:web` (Vitest).

**Gotchas:**
- **Two test runners.** Catalog-builder + server tests run under **Jest** (`tests/commands/app/`, `tests/app/server/`); frontend tests run under **Vitest** (`app:test:web`, colocated `*.test.ts(x)` under `app/web/src`). Jest's CJS transform can't load the ESM `@freearhey/core` chain — that's why `index.ts` **dynamically** imports the catalog builder (keeps `createApp` testable) and why `ensureCatalog` has no Jest test.
- **Lint/line-ending boundary.** `npm run lint` only covers `scripts/**` + `tests/**`, which must be **CRLF**. Everything under `app/**` (server + web) uses **LF** and is *not* linted. When editing a file under `scripts/`/`tests/`, run `npx eslint --fix <file>` to normalize CRLF.
- **Config lives at `app/.env`** (not repo root — that's where `.env.example` sits; root `.env` works as a fallback). Vars: `VLC_HOST`/`VLC_PORT`/`VLC_PASSWORD`, `APP_PORT`, `CATALOG_PATH`.
- **Dependency env.** `.npmrc` pins `legacy-peer-deps=true` (for a `@vitejs/plugin-react`↔`@babel/core` peer conflict); because that disables peer auto-install, `typescript`, `@testing-library/dom`, and `dotenv` are explicit deps.
- Design spec + implementation plan (historical): `docs/superpowers/specs/2026-07-10-*` and `docs/superpowers/plans/2026-07-10-*`.
