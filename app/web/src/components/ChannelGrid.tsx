import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { ChannelEntry, StreamEntry } from '../lib/types'
import { ChannelCard } from './ChannelCard'

export function ChannelGrid({
  channels,
  onPlay
}: {
  channels: ChannelEntry[]
  onPlay(stream: StreamEntry, channel: ChannelEntry): void
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: channels.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 68,
    overscan: 10
  })

  return (
    <div className="grid" ref={parentRef}>
      <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map(v => (
          <div
            key={channels[v.index].id}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${v.start}px)` }}
          >
            <ChannelCard channel={channels[v.index]} onPlay={onPlay} />
          </div>
        ))}
      </div>
      {channels.length === 0 && <p>No channels match these filters.</p>}
    </div>
  )
}
