# IPTV Channel Browser — Design Spec

**Date:** 2026-07-10
**Status:** Approved (design), pending implementation plan
**Branch:** `app/channel-browser`

## Problem

The repo publishes M3U playlists (e.g. `index.m3u`) that load into VLC as one long flat list of channels with no grouping. There is no good way to browse *what is available* by category, country, or language. We want a richer UI to navigate the catalog, and — crucially — to control VLC live from that UI: click a channel in the browser and have VLC immediately switch to it.

## Goals (v1)

- A browsable UI over the full channel catalog with combinable filters: **category, country, language**, plus **free-text search**.
- **Live VLC remote control**: click a channel → VLC plays it now; plus pause, stop, volume, and a now-playing display.
- Reuse this repo's existing data pipeline (metadata join by stream ID).
- Run locally on the user's machine.

## Non-goals (v1)

Explicitly out of scope, noted as possible future work:
- Scheduled/automatic catalog rebuilds for a 24/7 hosted server.
- Live stream health-checking / dead-link detection.
- Multi-user or publicly hosted mode.
- EPG / program guide integration.

## Key Decisions

| Decision | Choice |
|---|---|
| VLC interaction | Live remote control via VLC's HTTP interface |
| Data source | iptv-org **API metadata** joined with **this repo's stream URLs** (by stream ID `channel@feed`) |
| Navigation axes | Category + Country + Language + free-text search, all combinable |
| Home & stack | New `app/` folder in this repo; **React + Vite + TypeScript** SPA + Node/TS helper server |
| Catalog freshness | Server **auto-builds `catalog.json` on startup if missing** (Option 1); `app:catalog` is the manual "refresh now" command |

## Architecture

```
Browser (React/Vite SPA)
   │  fetch catalog.json    │  POST /api/play {url, headers}
   ▼                        ▼
Helper server (Node/TS) ── relays ──► VLC HTTP interface (localhost:8080)
   ▲                                     └─ VLC plays the stream
   └─ serves built SPA + catalog.json
```

- **Data build (offline / auto):** `app:catalog` calls existing `loadData()` (`scripts/api.ts`) + `PlaylistParser` to join API metadata with repo stream URLs, emitting `app/catalog.json`.
- **Runtime:** helper server serves the built SPA and `catalog.json`, and exposes `/api/*` control endpoints that relay to VLC. The SPA holds the whole catalog in memory and filters client-side.
- **Auto-build:** on `app:start` / `app:dev`, if `catalog.json` is missing the server builds it first; if present it is used as-is. This avoids a mandatory manual first step while keeping startup fast on subsequent runs.

### Project structure

```
app/
  server/
    index.ts        # http server: static SPA + catalog + /api routes; auto-build on startup
    vlc.ts          # VLC HTTP client (play/pause/stop/volume/status)
    config.ts       # VLC host/port/password, ports (env / .env)
  web/              # Vite + React + TypeScript SPA
    src/
      App.tsx
      components/    # FilterSidebar, SearchBar, ChannelGrid, ChannelCard, NowPlayingBar
      hooks/         # useCatalog, useVlcControl, useVlcStatus
      lib/           # filtering.ts, apiClient.ts, types.ts
      styles/
    index.html
    vite.config.ts   # dev: proxy /api → helper server
  catalog.json       # generated artifact (gitignored)
  README.md          # setup + run instructions
  .env.example       # VLC_HOST/PORT/PASSWORD, APP_PORT

scripts/commands/app/catalog.ts   # the app:catalog generator (idiomatic w/ existing commands)
```

New npm scripts: `app:catalog` (build data), `app:dev` (Vite + server concurrently), `app:build` (vite build), `app:start` (serve built SPA + api).

## Catalog Data Model

`app/catalog.json` (generated):

```jsonc
{
  "generatedAt": "2026-07-10T...Z",
  "filters": {                        // precomputed facet lists for the sidebar
    "categories": [{ "id": "news", "name": "News", "count": 2240 }, ...],
    "countries":  [{ "code": "US", "name": "United States", "flag": "🇺🇸", "count": 900 }, ...],
    "languages":  [{ "code": "eng", "name": "English", "count": 5000 }, ...]
  },
  "channels": [
    {
      "id": "BBCNews.uk",
      "name": "BBC News",
      "logo": "https://.../bbcnews.png",
      "categories": ["news"],
      "country": "GB",
      "languages": ["eng"],
      "isNsfw": false,
      "streams": [
        {
          "url": "https://.../playlist.m3u8",
          "quality": "1080p",
          "label": "",                 // e.g. "Geo-blocked", "Not 24/7"
          "userAgent": null,           // from #EXTVLCOPT, needed by VLC
          "referrer": null
        }
      ]
    }
  ]
}
```

- **Channel-centric:** streams grouped under their channel; one card per channel. Multi-stream channels expose a quality/source picker.
- **`userAgent`/`referrer` carried through** from `#EXTVLCOPT` — required for header-gated streams to play in VLC.
- **Facets precomputed** so sidebar counts are instant.
- **`isNsfw`** included to drive a "hide adult" toggle (the `xxx` category + DB flag).
- Channels with **no playable stream** in this repo are dropped (nothing to play).

## VLC Control

**One-time VLC setup** (documented in `app/README.md`): enable VLC's web interface and set a password (Preferences → Interface → Main interfaces → "Web", then Lua HTTP → Password; or launch with `--extraintf http --http-password <pw>`). VLC listens on `http://localhost:8080`.

**Why the helper server is required:** VLC's HTTP interface sends no CORS headers and requires HTTP Basic auth, so a direct browser `fetch` is blocked. The Node helper proxies: browser → clean `/api/*` → server → VLC (with password). This also keeps the VLC password out of the browser.

**`app/server/vlc.ts` endpoint mapping** (VLC `requests/status.xml` command API):

| Our endpoint | VLC request |
|---|---|
| `POST /api/play` `{url, userAgent?, referrer?}` | `?command=in_play&input=<url>` + per-input `option=:http-user-agent=…` / `:http-referrer=…` |
| `POST /api/pause` | `?command=pl_pause` |
| `POST /api/stop` | `?command=pl_stop` |
| `POST /api/volume` `{value}` | `?command=volume&val=<0-320>` |
| `GET /api/status` | reads `status.xml` → `{state, volume, currentUrl}` |

- `in_play` replaces the current item and starts playback immediately (the "click → switch now" behavior).
- Per-stream headers passed as VLC input options on the `in_play` call.
- All requests use Basic auth with the configured password.

**Now-playing sync:** SPA polls `GET /api/status` every ~2s to drive the now-playing bar (channel name, play/pause state, volume). No websockets.

## Frontend UX

Three regions: filter sidebar (left), search + channel grid (main), now-playing bar (bottom).

```
┌──────────────┬───────────────────────────────────────────┐
│  FILTERS     │  🔍 Search channels…                        │
│ Category     │  ┌────┐ ┌────┐ ┌────┐ ┌────┐               │
│ ☑ News       │  │logo│ │logo│ │logo│ │logo│   channel     │
│ ☐ Sports …   │  └────┘ └────┘ └────┘ └────┘   grid        │
│ Country      │  🇬🇧 BBC News · News · 1080p                 │
│ ☐ US ☐ GB …  │                                            │
│ Language     │                                            │
│ ☐ English …  │                                            │
│ ☐ Hide adult │                                            │
├──────────────┴───────────────────────────────────────────┤
│ ▶ Now playing: BBC News   ⏸  ⏹   🔊 ▁▂▃▅   [pick quality] │
└───────────────────────────────────────────────────────────┘
```

**Components**
- **FilterSidebar** — category/country/language facets (multi-select with precomputed counts) + "Hide adult" toggle. Filters combine: **within a facet = OR, across facets = AND**.
- **SearchBar** — instant client-side substring match on channel name + alt-names, combined with active filters.
- **ChannelGrid / ChannelCard** — logo, name, country flag, category badges, quality. Click → play. Multi-stream channels show a quality/source picker; otherwise play the highest-resolution stream by default.
- **NowPlayingBar** — current channel, play/pause, stop, volume slider, driven by `/api/status`.

**State & data flow**
- `useCatalog` loads `catalog.json` once into memory.
- `lib/filtering.ts` is a **pure function** `(channels, filterState) → channels` — no DOM, no network; trivially unit-testable and fast.
- `useVlcControl` posts to `/api/play|pause|stop|volume`; `useVlcStatus` polls `/api/status`.
- Filter/search state held in the URL query string → bookmarkable, survives refresh.
- **Grid virtualized** (render only visible cards) for smooth scrolling of ~10k channels with logos.

## Configuration

`app/server/config.ts`, from `.env` / env vars with defaults:
- `VLC_HOST` (default `localhost`), `VLC_PORT` (`8080`), `VLC_PASSWORD` (required), `APP_PORT` (helper server, e.g. `4000`).
- `.env.example` committed; real `.env` gitignored. `app/README.md` documents VLC setup + these vars.

## Error Handling

| Situation | Server behavior | UI behavior |
|---|---|---|
| VLC not running / web interface off (connection refused) | 502 + `{error: "vlc_unreachable"}` | Banner: "Can't reach VLC — is it running with the web interface enabled?" + setup link |
| Wrong VLC password (401 from VLC) | 502 + `{error: "vlc_auth"}` | Banner: "VLC rejected the password — check `VLC_PASSWORD`." |
| `catalog.json` missing at startup | Auto-build; if the build fails (e.g. no network) → clear log + non-zero exit | Build error visible in console |
| Stream plays but is dead/geo-blocked | Not fully detectable; `/api/status` may show `stopped` | Now-playing shows state; stream `label` (Geo-blocked / Not 24/7) shown on the card up front |
| Malformed `/api/play` request | 400 with validation message | — |

Guiding principle: VLC-connectivity errors are the common real-world case and get explicit, actionable messages.

## Testing

- **Catalog builder** — integration test in the repo's existing Jest style: fixture channels + fixture `.m3u` → assert joined `catalog.json` (grouping, header pass-through, NSFW flag, facet counts). Fits `tests/` conventions.
- **VLC client (`vlc.ts`)** — unit tests against a mock VLC HTTP endpoint: correct command URLs, Basic auth header, per-input `option` params for user-agent/referrer, error mapping (refused → `vlc_unreachable`, 401 → `vlc_auth`).
- **`lib/filtering.ts`** — pure-function unit tests (Vitest): each facet, OR-within/AND-across, search, hide-adult, combinations.
- **Components** — React Testing Library tests for key interactions: clicking a card calls play with the right stream; multi-stream card shows the picker; now-playing reflects status.
- Frontend uses **Vitest**; catalog/server tests stay in the repo's **Jest** suite.

## Future Work (not v1)

- Scheduled catalog auto-rebuild for a 24/7 live server.
- Live stream health-checking.
- Hosted / multi-user mode.
- EPG / program guide.
