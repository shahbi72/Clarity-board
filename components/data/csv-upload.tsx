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

export default function CsvUpload({ onLoaded }: Props) {
  const [status, setStatus] = React.useState<string>(INITIAL_STATUS)
  const [statusState, setStatusState] = React.useState<UploadState>('idle')
  const [fileName, setFileName] = React.useState<string>('')
  const [progress, setProgress] = React.useState<number>(0)

  const isLoading = statusState === 'loading'

  const handleFile = React.useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        onLoaded([])
        setFileName(file.name)
        setStatusState('error')
        setProgress(0)
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
      setStatus(`Parsing ${file.name}...`)
      const startedAt = performance.now()

      try {
        const parsed = file.name.toLowerCase().match(/\.xlsx?$/)
          ? await parseXlsxFile(file, setProgress)
          : await parseCsvFile(file, setProgress)

        onLoaded(parsed.txs)

        if (parsed.txs.length === 0) {
          setStatusState('error')
          setStatus('No valid rows found. Include amount values and check your column formatting.')
          return
        }

        setStatusState('success')
        setStatus(buildSuccessMessage(parsed.meta, performance.now() - startedAt))
      } catch (error) {
        onLoaded([])
        setStatusState('error')
        setProgress(0)
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
            Delimiters supported: comma, semicolon, or tab.
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

function buildSuccessMessage(meta: CsvParseMeta, durationMs: number): string {
  const rowLabel = meta.validRows === 1 ? 'row' : 'rows'
  const detailParts: string[] = [`Loaded ${meta.validRows} ${rowLabel}.`]

  const delimiter = meta.delimiter === '\t' ? 'tab' : meta.delimiter === ';' ? 'semicolon' : 'comma'
  detailParts.push(`Detected ${delimiter} delimiter.`)

  if (meta.normalizedRows > 0) {
    detailParts.push(`Padded ${meta.normalizedRows} short ${meta.normalizedRows === 1 ? 'row' : 'rows'}.`)
  }
  if (meta.skippedRows > 0) {
    detailParts.push(`Skipped ${meta.skippedRows} invalid ${meta.skippedRows === 1 ? 'row' : 'rows'}.`)
  }
  if (meta.parseErrors > 0) {
    detailParts.push(`Parser reported ${meta.parseErrors} format warning${meta.parseErrors === 1 ? '' : 's'}.`)
  }
  if (meta.ambiguousDateRows > 0) {
    detailParts.push(
      `Detected ambiguous day/month format in ${meta.ambiguousDateRows} ${
        meta.ambiguousDateRows === 1 ? 'row' : 'rows'
      }. Defaulted to month/day.`
    )
  }
  detailParts.push(`Processed in ${(durationMs / 1000).toFixed(2)}s.`)

  return detailParts.join(' ')
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
