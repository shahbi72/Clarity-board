import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import CsvUpload, {
  buildImportSummary,
  shouldShowDateAmbiguityWarning,
  shouldShowLargeFileHint,
} from '@/components/data/csv-upload'

describe('CsvUpload', () => {
  it('renders accessible idle state selectors', () => {
    render(<CsvUpload onLoaded={vi.fn()} />)

    expect(screen.getByTestId('csv-file-input')).toHaveAttribute('type', 'file')
    expect(screen.getByTestId('csv-upload-status')).toHaveAttribute('data-state', 'idle')
    expect(screen.getByTestId('csv-upload-file')).toHaveTextContent('No file selected yet.')
    expect(screen.getByText('Delimiters: comma, semicolon, tab. Starter: max 25MB.')).toBeInTheDocument()
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

  it('builds minimal import summary text', () => {
    expect(buildImportSummary({ validRows: 123, skippedRows: 7 })).toBe(
      'Imported 123 rows (skipped 7)'
    )
  })

  it('shows date ambiguity warning only when ambiguity is high', () => {
    expect(shouldShowDateAmbiguityWarning({ ambiguousDateRows: 12, totalRows: 40 })).toBe(true)
    expect(shouldShowDateAmbiguityWarning({ ambiguousDateRows: 4, totalRows: 10 })).toBe(false)
    expect(shouldShowDateAmbiguityWarning({ ambiguousDateRows: 8, totalRows: 100 })).toBe(false)
  })

  it('shows large file hint only when size or row thresholds are exceeded', () => {
    expect(shouldShowLargeFileHint({ fileSizeBytes: 10 * 1024 * 1024, totalRows: 50_000 })).toBe(false)
    expect(shouldShowLargeFileHint({ fileSizeBytes: 10 * 1024 * 1024 + 1 })).toBe(true)
    expect(shouldShowLargeFileHint({ totalRows: 50_001 })).toBe(true)
  })
})
