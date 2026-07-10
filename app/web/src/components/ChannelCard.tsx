import { useState } from 'react'
import type { ChannelEntry, StreamEntry } from '../lib/types'

export function ChannelCard({
  channel,
  onPlay
}: {
  channel: ChannelEntry
  onPlay(stream: StreamEntry, channel: ChannelEntry): void
}) {
  const [index, setIndex] = useState(0)
  const stream = channel.streams[index] || channel.streams[0]
  const initials = channel.name.slice(0, 2).toUpperCase()

  return (
    <div className="card" onClick={() => onPlay(stream, channel)}>
      {channel.logo ? (
        <img src={channel.logo} alt="" loading="lazy" />
      ) : (
        <div className="logo-fallback">{initials}</div>
      )}
      <div style={{ flex: 1 }}>
        <div>{channel.name}</div>
        <small>
          {channel.categories.map(c => (
            <span className="badge" key={c}>{c}</span>
          ))}
          {stream.quality && <span className="badge">{stream.quality}</span>}
          {stream.label && <span className="badge">{stream.label}</span>}
        </small>
      </div>
      {channel.streams.length > 1 && (
        <select
          aria-label={`Quality for ${channel.name}`}
          value={index}
          onClick={e => e.stopPropagation()}
          onChange={e => setIndex(Number(e.target.value))}
        >
          {channel.streams.map((s, i) => (
            <option key={i} value={i}>{s.quality || `Source ${i + 1}`}</option>
          ))}
        </select>
      )}
    </div>
  )
}
