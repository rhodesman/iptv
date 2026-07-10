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
