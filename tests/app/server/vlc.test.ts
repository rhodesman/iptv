import http from 'node:http'
import { AddressInfo } from 'node:net'
import { VlcClient } from '../../../app/server/vlc'

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
