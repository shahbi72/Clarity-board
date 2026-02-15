import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import CsvPreview from '@/components/CsvPreview'

describe('CsvPreview', () => {
  it('shows an empty state before any upload', () => {
    render(<CsvPreview txs={[]} />)

    expect(screen.getByTestId('csv-preview')).toHaveAttribute('data-state', 'empty')
    expect(screen.queryByTestId('csv-preview-row')).not.toBeInTheDocument()
  })

  it('shows rows after transactions are provided', () => {
    render(
      <CsvPreview
        txs={[
          { amount: 200, type: 'revenue', productName: 'A', date: '2026-02-10' },
          { amount: 80, type: 'expense', productName: 'B', date: '2026-02-11' },
        ]}
      />
    )

    expect(screen.getByTestId('csv-preview')).toHaveAttribute('data-state', 'ready')
    expect(screen.getAllByTestId('csv-preview-row')).toHaveLength(2)
  })
})
