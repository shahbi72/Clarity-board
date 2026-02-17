'use client'

import React from 'react'
import { UploadCloud, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { UploadDatasetResponse } from '@/lib/types/data-pipeline'

interface DatasetUploaderProps {
  onUploadSuccess?: (payload: UploadDatasetResponse) => void
  onUploadError?: (message: string) => void
  className?: string
  submitLabel?: string
}

export function DatasetUploader({
  onUploadSuccess,
  onUploadError,
  className,
  submitLabel = 'Upload dataset',
}: DatasetUploaderProps) {
  const [datasetName, setDatasetName] = React.useState('')
  const [file, setFile] = React.useState<File | null>(null)
  const [status, setStatus] = React.useState<string>('')
  const [statusTone, setStatusTone] = React.useState<'idle' | 'error' | 'success'>('idle')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const canSubmit = !isSubmitting && !!file

  const handleFileChange = (nextFile: File | null) => {
    setFile(nextFile)
    setStatus('')
    setStatusTone('idle')
    if (!nextFile) return
    setDatasetName((current) =>
      current.trim() ? current : stripFileExtension(nextFile.name)
    )
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) return

    setIsSubmitting(true)
    setStatus('Uploading dataset...')
    setStatusTone('idle')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('datasetName', datasetName.trim() || stripFileExtension(file.name))

      const response = await fetch('/api/datasets/upload', {
        method: 'POST',
        body: formData,
      })

      const payload = (await response.json()) as UploadDatasetResponse | { error?: string }
      if (!response.ok || !('datasetId' in payload)) {
        throw new Error(payload && typeof payload === 'object' && 'error' in payload ? payload.error || 'Failed to upload dataset.' : 'Failed to upload dataset.')
      }

      setStatusTone('success')
      setStatus(`Uploaded ${payload.rowCount.toLocaleString()} rows.`)
      onUploadSuccess?.(payload)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload dataset.'
      setStatusTone('error')
      setStatus(message)
      onUploadError?.(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('space-y-4 rounded-xl border border-border/70 bg-card/80 p-6', className)}
    >
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Data import
        </div>
        <h2 className="text-base font-semibold text-foreground">Upload CSV or XLSX</h2>
        <p className="text-sm text-muted-foreground">
          Max file size 25MB. Data is persisted and available across refresh.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Input
          value={datasetName}
          onChange={(event) => setDatasetName(event.target.value)}
          placeholder="Dataset name"
          aria-label="Dataset name"
          maxLength={120}
        />
        <label
          htmlFor="dataset-file-input"
          className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <UploadCloud className="h-4 w-4" />
          Choose file
          <input
            id="dataset-file-input"
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
            disabled={isSubmitting}
          />
        </label>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          <span>{file ? file.name : 'No file selected yet.'}</span>
        </div>
        {file && <span>{formatBytes(file.size)}</span>}
      </div>

      {status && (
        <div
          className={cn(
            'rounded-lg border px-3 py-2 text-sm',
            statusTone === 'success' && 'border-emerald-300 bg-emerald-50 text-emerald-900',
            statusTone === 'error' && 'border-destructive/40 bg-destructive/10 text-destructive',
            statusTone === 'idle' && 'border-border/60 bg-muted/30 text-muted-foreground'
          )}
          role="status"
          aria-live="polite"
        >
          {status}
        </div>
      )}

      <Button type="submit" disabled={!canSubmit} className="w-full md:w-auto">
        {isSubmitting ? 'Uploading...' : submitLabel}
      </Button>
    </form>
  )
}

function stripFileExtension(fileName: string): string {
  const trimmed = fileName.trim()
  if (!trimmed) return 'dataset'
  return trimmed.replace(/\.[^/.]+$/, '') || 'dataset'
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}
