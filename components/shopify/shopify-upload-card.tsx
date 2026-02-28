'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UploadCloud, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { UploadDatasetResponse } from '@/lib/types/data-pipeline'

type ShopifyUploadCardProps = {
  className?: string
  onUploaded?: (payload: UploadDatasetResponse) => void
}

export function ShopifyUploadCard({ className, onUploaded }: ShopifyUploadCardProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<'info' | 'error' | 'success'>('info')

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file)
    setMessage(null)
    setMessageTone('info')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedFile || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setMessage('Parsing Shopify Orders export...')
    setMessageTone('info')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('datasetName', `Shopify Orders ${new Date().toISOString().slice(0, 10)}`)

      const response = await fetch('/api/datasets/upload', {
        method: 'POST',
        body: formData,
      })

      const payload = (await response.json()) as UploadDatasetResponse | { error?: string }

      if (response.status === 401) {
        router.push('/login?next=/upload')
        return
      }

      if (!response.ok || !('datasetId' in payload)) {
        throw new Error(
          payload && typeof payload === 'object' && 'error' in payload
            ? payload.error || 'Upload failed.'
            : 'Upload failed.'
        )
      }

      setMessageTone('success')
      setMessage(`Loaded ${payload.rowCount.toLocaleString()} Shopify line items.`)
      onUploaded?.(payload)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed.'
      setMessageTone('error')
      setMessage(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('rounded-2xl border border-border/70 bg-card p-6 shadow-sm', className)}
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Shopify MVP
        </p>
        <h2 className="text-xl font-semibold">Upload Shopify Orders CSV</h2>
        <p className="text-sm text-muted-foreground">
          Only Shopify Orders export is supported. Max file size 25MB.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <label
          htmlFor="dataset-file-input"
          className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-sm"
        >
          <span className="inline-flex items-center gap-2">
            <UploadCloud className="h-4 w-4" />
            {selectedFile ? selectedFile.name : 'Choose Shopify Orders CSV'}
          </span>
          <span className="text-xs text-muted-foreground">{selectedFile ? formatBytes(selectedFile.size) : '.csv'}</span>
        </label>
        <input
          ref={fileInputRef}
          id="dataset-file-input"
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
          disabled={isSubmitting}
        />

        <Button type="submit" className="w-full" disabled={!selectedFile || isSubmitting}>
          {isSubmitting ? 'Processing...' : 'Upload Shopify Orders CSV'}
        </Button>
      </div>

      {message ? (
        <div
          className={cn(
            'mt-4 rounded-lg border px-3 py-2 text-sm',
            messageTone === 'info' && 'border-border bg-muted/40 text-muted-foreground',
            messageTone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
            messageTone === 'error' && 'border-rose-200 bg-rose-50 text-rose-900'
          )}
          role="status"
          aria-live="polite"
        >
          <div className="inline-flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{message}</span>
          </div>
        </div>
      ) : null}
    </form>
  )
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}
