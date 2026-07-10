import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NowPlayingBar } from './NowPlayingBar'

describe('NowPlayingBar', () => {
  it('shows the channel name and fires stop', async () => {
    const onStop = vi.fn()
    render(
      <NowPlayingBar channelName="BBC News" status={{ state: 'playing', volume: 256 }}
        onPause={() => {}} onStop={onStop} onVolume={() => {}} />
    )
    expect(screen.getByText(/BBC News/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /stop/i }))
    expect(onStop).toHaveBeenCalled()
  })
})
