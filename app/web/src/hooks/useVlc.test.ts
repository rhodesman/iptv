import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useVlc } from './useVlc'
import { api, ApiError } from '../lib/apiClient'

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'getStatus').mockResolvedValue({ state: 'stopped', volume: 256 })
})
afterEach(() => vi.useRealTimers())

describe('useVlc', () => {
  it('polls status on mount', async () => {
    const { result } = renderHook(() => useVlc())
    await waitFor(() => expect(result.current.status).toEqual({ state: 'stopped', volume: 256 }))
  })

  it('play delegates to api.play', async () => {
    const play = vi.spyOn(api, 'play').mockResolvedValue()
    const { result } = renderHook(() => useVlc())
    await act(async () => {
      await result.current.play({ url: 'u', userAgent: null, referrer: null })
    })
    expect(play).toHaveBeenCalledWith({ url: 'u', userAgent: null, referrer: null })
  })

  it('records vlc error code from a failed command', async () => {
    vi.spyOn(api, 'play').mockRejectedValue(new ApiError('vlc_unreachable', 'VLC unreachable'))
    const { result } = renderHook(() => useVlc())
    await act(async () => {
      await result.current.play({ url: 'u', userAgent: null, referrer: null }).catch(() => {})
    })
    await waitFor(() => expect(result.current.error).toBe('vlc_unreachable'))
  })
})
