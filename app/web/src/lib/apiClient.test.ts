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
