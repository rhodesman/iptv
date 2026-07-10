import { useCallback, useEffect, useState } from 'react'
import { api, ApiError, PlayInput, VlcStatus } from '../lib/apiClient'

const POLL_MS = 2000

export function useVlc() {
  const [status, setStatus] = useState<VlcStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const capture = useCallback((e: unknown) => {
    if (e instanceof ApiError) {
      setError(e.code)
    } else if (e !== null && typeof e === 'object' && 'name' in e && (e as { name: unknown }).name === 'ApiError' && 'code' in e) {
      setError(String((e as { code: unknown }).code))
    } else {
      setError('request_failed')
    }
  }, [])

  useEffect(() => {
    let active = true
    const poll = () => {
      api
        .getStatus()
        .then(s => {
          if (!active) return
          setStatus(s)
          setError(null)
        })
        .catch(capture)
    }
    poll()
    const id = setInterval(poll, POLL_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [capture])

  const play = useCallback(
    async (input: PlayInput) => {
      try {
        await api.play(input)
        setError(null)
      } catch (e) {
        capture(e)
        throw e
      }
    },
    [capture]
  )
  const pause = useCallback(() => api.pause().catch(capture), [capture])
  const stop = useCallback(() => api.stop().catch(capture), [capture])
  const setVolume = useCallback((v: number) => api.setVolume(v).catch(capture), [capture])

  return { status, error, play, pause, stop, setVolume }
}
