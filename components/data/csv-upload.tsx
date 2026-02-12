'use client'

import React from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { parseRowsFromHeader, parseRowsFromNoHeader, type Tx } from '@/lib/csv'

type Props = {
  onLoaded: (txs: Tx[]) => void
}

export default function CsvUpload({ onLoaded }: Props) {
  const [status, setStatus] = React.useState<string>('')
  const [fileName, setFileName] = React.useState<string>('')

  const handleFile = (file: File) => {
    setFileName(file.name)
    setStatus('Parsing…')
    if (file.name.toLowerCase().endsWith('.xlsx')) {
      parseXlsxFile(file, onLoaded, setStatus)
      return
    }

    parseCsvFile(file, onLoaded, setStatus)
  }

  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Data import
          </div>
          <div className="text-sm font-semibold text-foreground">Upload CSV or XLSX</div>
          <div className="text-xs text-muted-foreground">
            Drag and drop or browse files to refresh insights.
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border/70 bg-white px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-accent/40">
          Select file
          <input
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.currentTarget.value = ''
            }}
          />
        </label>
      </div>
      <div className="mt-3 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        {fileName ? `File: ${fileName}` : 'No file selected yet.'}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{status}</div>
    </div>
  )
}

function parseCsvFile(
  file: File,
  onLoaded: (txs: Tx[]) => void,
  setStatus: (value: string) => void
) {
  Papa.parse<Record<string, string>>(file, {
    header: true,
    skipEmptyLines: true,
    complete: (result) => {
      const fromHeader = parseRowsFromHeader(result.data || [])
      if (fromHeader.length > 0) {
        setStatus(`Loaded ${fromHeader.length} rows`)
        onLoaded(fromHeader)
        return
      }

      // Fallback for CSVs without headers
      Papa.parse<string[]>(file, {
        header: false,
        skipEmptyLines: true,
        complete: (fallback) => {
          const fromNoHeader = parseRowsFromNoHeader(fallback.data || [])
          setStatus(
            fromNoHeader.length > 0
              ? `Loaded ${fromNoHeader.length} rows`
              : 'No valid rows found. Check your columns or sample data.'
          )
          onLoaded(fromNoHeader)
        },
        error: () => {
          setStatus('Failed to parse CSV.')
          onLoaded([])
        },
      })
    },
    error: () => {
      setStatus('Failed to parse CSV.')
      onLoaded([])
    },
  })
}

function parseXlsxFile(
  file: File,
  onLoaded: (txs: Tx[]) => void,
  setStatus: (value: string) => void
) {
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = new Uint8Array(reader.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.SheetNames[0]
      if (!firstSheet) {
        setStatus('No sheets found in workbook.')
        onLoaded([])
        return
      }
      const worksheet = workbook.Sheets[firstSheet]
      const csvText = XLSX.utils.sheet_to_csv(worksheet)
      const blob = new Blob([csvText], { type: 'text/csv' })
      parseCsvFile(
        new File([blob], file.name.replace(/\.xlsx$/i, '.csv'), { type: 'text/csv' }),
        onLoaded,
        setStatus
      )
    } catch {
      setStatus('Failed to parse XLSX.')
      onLoaded([])
    }
  }
  reader.onerror = () => {
    setStatus('Failed to read XLSX file.')
    onLoaded([])
  }
  reader.readAsArrayBuffer(file)
}
