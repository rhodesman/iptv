import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterSidebar } from './FilterSidebar'
import { EMPTY_FILTERS } from '../lib/types'

const catalogFilters = {
  categories: [{ id: 'news', name: 'News', count: 2 }],
  countries: [{ id: 'US', name: 'United States', flag: '🇺🇸', count: 5 }],
  languages: [{ id: 'eng', name: 'English', count: 9 }]
}

// Deliberately out-of-order so we can assert the component sorts them.
const unsortedCategories = {
  categories: [
    { id: 'sports', name: 'Sports', count: 3 },
    { id: 'animation', name: 'Animation', count: 1 },
    { id: 'news', name: 'News', count: 2 }
  ],
  countries: [{ id: 'US', name: 'United States', flag: '🇺🇸', count: 5 }],
  languages: [{ id: 'eng', name: 'English', count: 9 }]
}

describe('FilterSidebar', () => {
  it('toggles a category on click', async () => {
    const onChange = vi.fn()
    render(<FilterSidebar filters={EMPTY_FILTERS} catalogFilters={catalogFilters} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText(/News/))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ categories: ['news'] }))
  })

  it('toggles hide-adult', async () => {
    const onChange = vi.fn()
    render(<FilterSidebar filters={EMPTY_FILTERS} catalogFilters={catalogFilters} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText(/Hide adult/i))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hideAdult: true }))
  })

  it('renders facets in alphabetical order regardless of input order', () => {
    const { container } = render(
      <FilterSidebar filters={EMPTY_FILTERS} catalogFilters={unsortedCategories} onChange={vi.fn()} />
    )
    const text = container.textContent || ''
    expect(text.indexOf('Animation')).toBeGreaterThan(-1)
    expect(text.indexOf('Animation')).toBeLessThan(text.indexOf('News'))
    expect(text.indexOf('News')).toBeLessThan(text.indexOf('Sports'))
  })

  it('collapses and expands a section when its header is clicked', async () => {
    render(<FilterSidebar filters={EMPTY_FILTERS} catalogFilters={catalogFilters} onChange={vi.fn()} />)
    // expanded by default: the News checkbox is visible
    expect(screen.getByLabelText(/News/)).toBeInTheDocument()

    const header = screen.getByRole('button', { name: /Category/i })
    expect(header).toHaveAttribute('aria-expanded', 'true')

    await userEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText(/News/)).not.toBeInTheDocument()

    await userEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText(/News/)).toBeInTheDocument()
  })
})
