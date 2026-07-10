import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError, PlayInput, VlcStatus } from '../lib/apiClient'

const POLL_MS = 2000

export function useVlc(): {
  status: VlcStatus | null
  error: string | null
  play(input: PlayInput): Promise<void>
  pause(): Promise<void>
  stop(): Promise<void>
  setVolume(v: number): Promise<void>
} {
  const [status, setStatus] = useState<VlcStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const activeRef = useRef(true)

  useEffect(() => () => {
    activeRef.current = false
  }, [])

  const capture = useCallback((e: unknown) => {
    if (!activeRef.current) return
    setError(e instanceof ApiError ? e.code : 'request_failed')
  }, [])

  useEffect(() => {
    const poll = () => {
      api
        .getStatus()
        .then(s => {
          if (!activeRef.current) return
          setStatus(s)
          setError(null)
        })
        .catch(capture)
    }
    poll()
    const id = setInterval(poll, POLL_MS)
    return () => {
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
