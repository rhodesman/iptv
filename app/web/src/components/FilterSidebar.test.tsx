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
})
