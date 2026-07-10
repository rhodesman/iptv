import { useEffect, useMemo, useState } from 'react'
import { useCatalog } from './hooks/useCatalog'
import { useVlc } from './hooks/useVlc'
import { filterChannels } from './lib/filtering'
import { filtersToQuery, queryToFilters } from './lib/url'
import type { ChannelEntry, FilterState, StreamEntry } from './lib/types'
import { FilterSidebar } from './components/FilterSidebar'
import { SearchBar } from './components/SearchBar'
import { ChannelGrid } from './components/ChannelGrid'
import { NowPlayingBar } from './components/NowPlayingBar'
import { ErrorBanner } from './components/ErrorBanner'

export default function App() {
  const { catalog, loading, error: catalogError } = useCatalog()
  const { status, error: vlcError, play, pause, stop, setVolume } = useVlc()
  const [filters, setFilters] = useState<FilterState>(() => queryToFilters(window.location.search.slice(1)))
  const [nowPlaying, setNowPlaying] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const q = filtersToQuery(filters)
    const url = q ? `?${q}` : window.location.pathname
    window.history.replaceState(null, '', url)
  }, [filters])

  const visible = useMemo(
    () => (catalog ? filterChannels(catalog.channels, filters) : []),
    [catalog, filters]
  )

  const onPlay = (stream: StreamEntry, channel: ChannelEntry) => {
    setNowPlaying(channel.name)
    setDismissed(false)
    void play({ url: stream.url, userAgent: stream.userAgent, referrer: stream.referrer }).catch(() => {})
  }

  const activeError = dismissed ? null : catalogError || vlcError

  if (loading) return <div className="app"><p style={{ padding: 24 }}>Loading catalog…</p></div>

  return (
    <div className="app">
      <ErrorBanner code={activeError} onDismiss={() => setDismissed(true)} />
      {catalog && (
        <FilterSidebar filters={filters} catalogFilters={catalog.filters} onChange={setFilters} />
      )}
      <div className="main">
        <SearchBar value={filters.search} onChange={s => setFilters({ ...filters, search: s })} />
        <ChannelGrid channels={visible} onPlay={onPlay} />
      </div>
      <NowPlayingBar
        channelName={nowPlaying}
        status={status}
        onPause={pause}
        onStop={() => {
          setNowPlaying(null)
          void stop()
        }}
        onVolume={setVolume}
      />
    </div>
  )
}
