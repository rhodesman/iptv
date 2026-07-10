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
