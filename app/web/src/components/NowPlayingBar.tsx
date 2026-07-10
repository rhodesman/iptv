import type { VlcStatus } from '../lib/apiClient'

export function NowPlayingBar({
  channelName,
  status,
  onPause,
  onStop,
  onVolume
}: {
  channelName: string | null
  status: VlcStatus | null
  onPause(): void
  onStop(): void
  onVolume(v: number): void
}) {
  return (
    <footer className="nowplaying">
      <span>▶ {channelName ? channelName : 'Nothing playing'}</span>
      {status && <span className="badge">{status.state}</span>}
      <button onClick={onPause} aria-label="Pause">⏸</button>
      <button onClick={onStop} aria-label="Stop">⏹</button>
      <label>
        🔊
        <input
          type="range"
          min={0}
          max={320}
          value={status?.volume ?? 256}
          onChange={e => onVolume(Number(e.target.value))}
          aria-label="Volume"
        />
      </label>
    </footer>
  )
}
