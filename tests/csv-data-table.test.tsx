import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CsvDataTable from '@/components/CsvDataTable'

describe('CsvDataTable', () => {
  it('renders headers and rows for generic records', () => {
    const records = [
      { Name: 'Alpha', Amount: '10' },
      { Name: 'Beta', Amount: '20' },
    ]

    render(<CsvDataTable records={records} />)

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
  })
})
