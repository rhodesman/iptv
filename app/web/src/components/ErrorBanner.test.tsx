import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBanner } from './ErrorBanner'

describe('ErrorBanner', () => {
  it('renders nothing when code is null', () => {
    const { container } = render(<ErrorBanner code={null} onDismiss={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('maps a known code to an actionable message', () => {
    render(<ErrorBanner code="vlc_unreachable" onDismiss={() => {}} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/can't reach vlc/i)
  })

  it('falls back to the raw code for an unknown error', () => {
    render(<ErrorBanner code="something_weird" onDismiss={() => {}} />)
    expect(screen.getByRole('alert')).toHaveTextContent('something_weird')
  })

  it('calls onDismiss when the dismiss button is clicked', async () => {
    const onDismiss = vi.fn()
    render(<ErrorBanner code="vlc_auth" onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalled()
  })
})
