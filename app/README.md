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
