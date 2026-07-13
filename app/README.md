# IPTV Channel Browser

A local web app to browse the channel catalog by category, country, and language (with search) and control VLC live — click a channel and VLC plays it.

## Features

- **Browse & filter** by category, country, and language, plus free-text search. Filters combine as OR *within* a facet and AND *across* facets (e.g. News + Sports, in the US).
- **Sidebar** facets are sorted alphabetically, show per-facet counts, and each section (Category / Country / Language) is independently collapsible.
- **NSFW handling** — channels flagged `is_nsfw` in the database are surfaced as a synthetic **NSFW** category. The **Hide adult** checkbox filters those channels out and removes the NSFW facet from the sidebar. (In practice iptv-org carries almost no adult streams, so this affects only a handful of channels.)
- **Channel grid** is virtualized, so 10k+ channels scroll smoothly. Each card shows the logo (or initials), name, category/quality/label badges, and — when a channel has multiple streams — a quality/source picker.
- **Live VLC control** — clicking a channel plays it in VLC; a now-playing bar offers pause, stop, and a volume slider, and reflects VLC's status (polled every ~2s).
- **Shareable state** — the active filters and search live in the URL, so a filtered view survives refresh and can be bookmarked.

## One-time VLC setup

Enable VLC's web (HTTP) interface:

1. VLC → Preferences → show **All** settings → Interface → Main interfaces → check **Web**.
2. Interface → Main interfaces → Lua → set an **HTTP Password**.
3. Restart VLC. It now listens on `http://localhost:8080`.

(Or launch VLC from a terminal: `vlc --extraintf http --http-password <pw>`.)

## Configure

```sh
cp app/.env.example app/.env
# edit app/.env and set VLC_PASSWORD to the password you set in VLC
```

The server loads `app/.env` (a repo-root `.env` also works as a fallback). `app/.env` is gitignored, so your password is never committed.

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

`app/catalog.json` is a **generated artifact** (gitignored) built from the iptv-org API metadata joined with this repo's stream URLs. The server auto-builds it on first run only if it's missing, so regenerate it explicitly when you want fresher data — or after pulling changes that affect the builder (e.g. the NSFW category):

```sh
npm run api:load       # refresh upstream data (channels/streams)
npm run app:catalog    # rebuild app/catalog.json
```

## Troubleshooting

- **"Can't reach VLC"** — VLC isn't running or the web interface is off. Redo the setup above.
- **"VLC rejected the password"** — `VLC_PASSWORD` in `app/.env` doesn't match VLC's HTTP password (or `app/.env` is missing, so the password is empty). Confirm the file is at `app/.env` and the value matches what you set in VLC.
- **Some streams don't play** — they may be geo-blocked or offline; the card shows `Geo-blocked` / `Not 24/7` labels where known.
- **The helper server is local-only** — it binds to `127.0.0.1` and has no authentication, so only your machine can reach it.
