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
