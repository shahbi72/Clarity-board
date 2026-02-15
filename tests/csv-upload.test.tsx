import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import CsvUpload from '@/components/data/csv-upload'

describe('CsvUpload', () => {
  it('renders accessible idle state selectors', () => {
    render(<CsvUpload onLoaded={vi.fn()} />)

    expect(screen.getByTestId('csv-file-input')).toHaveAttribute('type', 'file')
    expect(screen.getByTestId('csv-upload-status')).toHaveAttribute('data-state', 'idle')
    expect(screen.getByTestId('csv-upload-file')).toHaveTextContent('No file selected yet.')
  })

  it('shows a clear file-size error without parsing oversized files', () => {
    const onLoaded = vi.fn()
    render(<CsvUpload onLoaded={onLoaded} />)

    const file = new File(['tiny'], 'oversized.csv', { type: 'text/csv' })
    Object.defineProperty(file, 'size', { value: 101 * 1024 * 1024 })

    fireEvent.change(screen.getByTestId('csv-file-input'), {
      target: { files: [file] },
    })

    expect(onLoaded).toHaveBeenCalledWith([])
    expect(screen.getByTestId('csv-upload-status')).toHaveAttribute('data-state', 'error')
    expect(screen.getByTestId('csv-upload-file')).toHaveTextContent('oversized.csv')
  })
})
