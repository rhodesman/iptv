import dotenv from 'dotenv'
// Load env from app/.env first (next to app/.env.example), then a repo-root .env
// as a fallback. Earlier paths win, so app/.env takes precedence.
dotenv.config({ path: ['app/.env', '.env'], quiet: true })
import express from 'express'
import * as fs from 'fs-extra'
import path from 'node:path'
import { loadConfig } from './config'
import { VlcClient, VlcError } from './vlc'

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

  app.post('/api/play', (req, res) => {
    if (typeof req.body.url !== 'string' || req.body.url === '') {
      res.status(400).json({ error: 'bad_request' })
      return
    }
    handle(res, () => deps.vlc.play(req.body))
  })
  app.post('/api/pause', (_req, res) => handle(res, () => deps.vlc.pause()))
  app.post('/api/stop', (_req, res) => handle(res, () => deps.vlc.stop()))
  app.post('/api/volume', (req, res) => {
    const value = Number(req.body.value)
    if (!isFinite(value)) {
      res.status(400).json({ error: 'bad_request' })
      return
    }
    handle(res, () => deps.vlc.setVolume(value))
  })
  app.get('/api/status', (_req, res) => handle(res, () => deps.vlc.getStatus(), true))

  const dist = path.resolve('app/web/dist')
  app.use(express.static(dist))
  app.get('/{*path}', (_req, res) => {
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
  const { buildCatalog, writeCatalog } = await import('../../scripts/commands/app/catalog')
  const catalog = await buildCatalog()
  await writeCatalog(catalogPath, catalog)
}

async function main() {
  const cfg = loadConfig()
  await ensureCatalog(cfg.catalogPath)
  const vlc = new VlcClient({ host: cfg.vlcHost, port: cfg.vlcPort, password: cfg.vlcPassword })
  const app = createApp({ vlc, catalogPath: cfg.catalogPath })
  app.listen(cfg.appPort, '127.0.0.1', () => {
    // eslint-disable-next-line no-console
    console.log(`channel browser on http://localhost:${cfg.appPort}`)
  })
}

if (process.argv[1] && process.argv[1].endsWith(path.join('app', 'server', 'index.ts'))) {
  main()
}
