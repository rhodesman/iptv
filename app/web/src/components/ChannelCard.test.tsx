import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChannelCard } from './ChannelCard'
import type { ChannelEntry } from '../lib/types'

const twoStream: ChannelEntry = {
  id: 'a', name: 'BBC News', logo: null, categories: ['news'], country: 'GB',
  languages: ['eng'], isNsfw: false,
  streams: [
    { url: 'hd', quality: '1080p', label: null, userAgent: null, referrer: null },
    { url: 'sd', quality: '480p', label: null, userAgent: null, referrer: null }
  ]
}

describe('ChannelCard', () => {
  it('plays the first (best) stream when the card is clicked', async () => {
    const onPlay = vi.fn()
    render(<ChannelCard channel={twoStream} onPlay={onPlay} />)
    await userEvent.click(screen.getByText('BBC News'))
    expect(onPlay).toHaveBeenCalledWith(twoStream.streams[0], twoStream)
  })

  it('shows a quality picker for multi-stream channels', () => {
    render(<ChannelCard channel={twoStream} onPlay={vi.fn()} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('480p')).toBeInTheDocument()
  })
})
