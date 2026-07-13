import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/apiClient'
import type { Catalog } from '../lib/types'

export function useCatalog(): { catalog: Catalog | null; loading: boolean; error: string | null } {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    api
      .getCatalog()
      .then(c => {
        if (active) setCatalog(c)
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof ApiError ? e.code : 'load_failed')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { catalog, loading, error }
}
