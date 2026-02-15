'use client'

import React from 'react'
import * as XLSX from 'xlsx'
import {
  parseCsvTextDetailed,
  type CsvParseMeta,
  type CsvParseResult,
  type Tx,
} from '@/lib/csv'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'

type Props = {
  onLoaded: (txs: Tx[]) => void
}

type UploadState = 'idle' | 'loading' | 'success' | 'error'

const INITIAL_STATUS = 'Upload a CSV to see insights.'
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024
const LARGE_FILE_HINT_BYTES = 10 * 1024 * 1024
const LARGE_FILE_HINT_ROWS = 50_000

export default function CsvUpload({ onLoaded }: Props) {
  const [status, setStatus] = React.useState<string>(INITIAL_STATUS)
  const [statusState, setStatusState] = React.useState<UploadState>('idle')
  const [fileName, setFileName] = React.useState<string>('')
  const [progress, setProgress] = React.useState<number>(0)
  const [showLargeFileHint, setShowLargeFileHint] = React.useState(false)
  const [showDateAmbiguityWarning, setShowDateAmbiguityWarning] = React.useState(false)

  const isLoading = statusState === 'loading'

  const handleFile = React.useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        onLoaded([])
        setFileName(file.name)
        setStatusState('error')
        setProgress(0)
        setShowLargeFileHint(false)
        setShowDateAmbiguityWarning(false)
        setStatus(
          `File too large (${formatMegabytes(file.size)} MB). Starter uploads support up to ${formatMegabytes(
            MAX_FILE_SIZE_BYTES
          )} MB.`
        )
        return
      }

      setFileName(file.name)
      setStatusState('loading')
      setProgress(5)
      setShowLargeFileHint(shouldShowLargeFileHint({ fileSizeBytes: file.size }))
      setShowDateAmbiguityWarning(false)
      setStatus(`Parsing ${file.name}...`)

      try {
        const parsed = file.name.toLowerCase().match(/\.xlsx?$/)
          ? await parseXlsxFile(file, setProgress)
          : await parseCsvFile(file, setProgress)

        onLoaded(parsed.txs)

        if (parsed.txs.length === 0) {
          setStatusState('error')
          setShowLargeFileHint(false)
          setShowDateAmbiguityWarning(false)
          setStatus('No valid rows found. Include amount values and check your column formatting.')
          return
        }

        setStatusState('success')
        setStatus(buildImportSummary(parsed.meta))
        setShowLargeFileHint(
          (previous) => previous || shouldShowLargeFileHint({ totalRows: parsed.meta.totalRows })
        )
        setShowDateAmbiguityWarning(shouldShowDateAmbiguityWarning(parsed.meta))
      } catch (error) {
        onLoaded([])
        setStatusState('error')
        setProgress(0)
        setShowLargeFileHint(false)
        setShowDateAmbiguityWarning(false)
        setStatus(getErrorMessage(error))
      }
    },
    [onLoaded]
  )

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-card/80 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Data import
          </div>
          <div className="text-base font-semibold text-foreground">Upload CSV or XLSX</div>
          <div className="text-sm text-muted-foreground">
            Delimiters: comma, semicolon, tab. Starter: max 25MB.
          </div>
        </div>
        <label
          htmlFor="csv-file-input"
          className={cn(
            'inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold transition',
            isLoading
              ? 'cursor-not-allowed border-border/50 bg-muted text-muted-foreground'
              : 'cursor-pointer border-border/70 bg-white text-foreground hover:bg-accent/40'
          )}
        >
          {isLoading ? 'Parsing...' : 'Select file'}
          <input
            id="csv-file-input"
            data-testid="csv-file-input"
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            disabled={isLoading}
            aria-label="Upload CSV or XLSX file"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                void handleFile(file)
              }
              event.currentTarget.value = ''
            }}
          />
        </label>
      </div>

      <div
        className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
        data-testid="csv-upload-file"
      >
        {fileName ? `File: ${fileName}` : 'No file selected yet.'}
      </div>

      <div
        className={cn(
          'rounded-lg border px-3 py-3 text-sm',
          statusState === 'error' && 'border-destructive/35 bg-destructive/10 text-destructive',
          statusState === 'success' && 'border-success/35 bg-success/10 text-foreground',
          statusState === 'loading' && 'border-primary/35 bg-primary/10 text-foreground',
          statusState === 'idle' && 'border-border/60 bg-muted/30 text-muted-foreground'
        )}
        role="status"
        aria-live="polite"
        data-testid="csv-upload-status"
        data-state={statusState}
      >
        <div className="flex items-center gap-2">
          {isLoading && <Spinner className="size-4" aria-hidden="true" />}
          <span>{status}</span>
        </div>
      </div>

      {showLargeFileHint && (
        <div
          className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground"
          data-testid="csv-large-file-hint"
          role="status"
          aria-live="polite"
        >
          Large file detected—parsing may take a moment.
        </div>
      )}

      {showDateAmbiguityWarning && (
        <div
          className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          data-testid="csv-date-ambiguity-warning"
          role="status"
          aria-live="polite"
        >
          Some dates may be ambiguous (DD/MM vs MM/DD).
        </div>
      )}

      {isLoading && (
        <div className="space-y-2" data-testid="csv-upload-progress">
          <Progress value={progress} aria-label="CSV parsing progress" />
          <div className="text-xs text-muted-foreground">{Math.round(progress)}% complete</div>
        </div>
      )}
    </div>
  )
}

function parseCsvFile(file: File, onProgress: (progress: number) => void): Promise<CsvParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onprogress = (event) => {
      if (!event.lengthComputable || event.total === 0) return
      const next = Math.min(80, Math.max(5, Math.round((event.loaded / event.total) * 80)))
      onProgress(next)
    }

    reader.onload = () => {
      try {
        const text = typeof reader.result === 'string' ? reader.result : ''
        onProgress(90)
        window.setTimeout(() => {
          try {
            const parsed = parseCsvTextDetailed(text)
            onProgress(100)
            resolve(parsed)
          } catch (error) {
            reject(error)
          }
        }, 0)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read CSV file.'))
    }

    reader.readAsText(file)
  })
}

function parseXlsxFile(file: File, onProgress: (progress: number) => void): Promise<CsvParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onprogress = (event) => {
      if (!event.lengthComputable || event.total === 0) return
      const next = Math.min(55, Math.max(5, Math.round((event.loaded / event.total) * 55)))
      onProgress(next)
    }

    reader.onload = () => {
      try {
        onProgress(65)
        const data = new Uint8Array(reader.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.SheetNames[0]
        if (!firstSheet) {
          throw new Error('No sheets found in workbook.')
        }

        const worksheet = workbook.Sheets[firstSheet]
        const csvText = XLSX.utils.sheet_to_csv(worksheet)
        onProgress(85)
        const parsed = parseCsvTextDetailed(csvText)
        onProgress(100)
        resolve(parsed)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read XLSX file.'))
    }

    reader.readAsArrayBuffer(file)
  })
}

export function buildImportSummary(meta: Pick<CsvParseMeta, 'validRows' | 'skippedRows'>): string {
  return `Imported ${meta.validRows} rows (skipped ${meta.skippedRows})`
}

export function shouldShowDateAmbiguityWarning(
  meta: Pick<CsvParseMeta, 'ambiguousDateRows' | 'totalRows'>
): boolean {
  if (meta.totalRows <= 0) return false
  return meta.ambiguousDateRows >= 5 && meta.ambiguousDateRows / meta.totalRows >= 0.2
}

export function shouldShowLargeFileHint(context: {
  fileSizeBytes?: number
  totalRows?: number
}): boolean {
  const largeBySize =
    typeof context.fileSizeBytes === 'number' && context.fileSizeBytes > LARGE_FILE_HINT_BYTES
  const largeByRows = typeof context.totalRows === 'number' && context.totalRows > LARGE_FILE_HINT_ROWS
  return largeBySize || largeByRows
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    if (error.message === 'No sheets found in workbook.') {
      return error.message
    }
    if (error.message.startsWith('Failed to read')) {
      return error.message
    }
  }
  return 'Failed to parse file. Check delimiter, quoting, and required amount values.'
}

function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1)
}
