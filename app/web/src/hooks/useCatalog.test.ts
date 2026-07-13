import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCatalog } from './useCatalog'

beforeEach(() => vi.restoreAllMocks())

const catalog = { generatedAt: 'x', filters: { categories: [], countries: [], languages: [] }, channels: [] }

describe('useCatalog', () => {
  it('loads the catalog', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => catalog }))
    const { result } = renderHook(() => useCatalog())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.catalog).toEqual(catalog)
    expect(result.current.error).toBeNull()
  })

  it('captures errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'catalog_unavailable' }) }))
    const { result } = renderHook(() => useCatalog())
    await waitFor(() => expect(result.current.error).toBe('catalog_unavailable'))
  })
})
