'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Eye,
  Loader2,
  Search,
  Plus,
  CheckCircle2,
  Database,
} from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import type {
  DataRow,
  DatasetDetailsResponse,
  DatasetListItem,
  DatasetsResponse,
} from '@/lib/types/data-pipeline'

type PreviewState = {
  open: boolean
  datasetName: string
  rows: DataRow[]
  loading: boolean
  error: string | null
}

const INITIAL_PREVIEW_STATE: PreviewState = {
  open: false,
  datasetName: '',
  rows: [],
  loading: false,
  error: null,
}

export default function DatasetsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [datasets, setDatasets] = useState<DatasetListItem[]>([])
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState>(INITIAL_PREVIEW_STATE)

  const loadDatasets = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/datasets', { cache: 'no-store' })
      const payload = (await response.json()) as DatasetsResponse | { error?: string }
      if (!response.ok || !('datasets' in payload)) {
        throw new Error(
          payload && typeof payload === 'object' && 'error' in payload
            ? payload.error || 'Failed to load datasets.'
            : 'Failed to load datasets.'
        )
      }

      setDatasets(payload.datasets)
      setActiveDatasetId(payload.activeDatasetId)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load datasets.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDatasets()
  }, [loadDatasets])

  useEffect(() => {
    const search = typeof window !== 'undefined' ? window.location.search : ''
    const params = new URLSearchParams(search)
    if (params.get('uploaded') !== '1') return
    const datasetName = params.get('dataset') || 'Dataset'
    toast({
      title: 'Upload complete',
      description: `${datasetName} is now persisted and available.`,
    })
    router.replace('/datasets')
  }, [router, toast])

  const filteredDatasets = useMemo(
    () =>
      datasets.filter((dataset) =>
        dataset.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [datasets, searchQuery]
  )

  const handleActivate = async (datasetId: string) => {
    setActivatingId(datasetId)
    try {
      const response = await fetch(`/api/datasets/${datasetId}/activate`, {
        method: 'POST',
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to activate dataset.')
      }

      setActiveDatasetId(datasetId)
      toast({
        title: 'Dataset activated',
        description: 'Dashboard will now use this dataset.',
      })
      router.push('/dashboard')
    } catch (activateError) {
      const message =
        activateError instanceof Error ? activateError.message : 'Failed to activate dataset.'
      toast({
        title: 'Activation failed',
        description: message,
      })
    } finally {
      setActivatingId(null)
    }
  }

  const handlePreview = async (datasetId: string, datasetName: string) => {
    setPreview({
      open: true,
      datasetName,
      rows: [],
      loading: true,
      error: null,
    })

    try {
      const response = await fetch(`/api/datasets/${datasetId}`, { cache: 'no-store' })
      const payload = (await response.json()) as DatasetDetailsResponse | { error?: string }
      if (!response.ok || !('dataset' in payload)) {
        throw new Error(
          payload && typeof payload === 'object' && 'error' in payload
            ? payload.error || 'Failed to load dataset preview.'
            : 'Failed to load dataset preview.'
        )
      }

      setPreview({
        open: true,
        datasetName: payload.dataset.name,
        rows: payload.previewRows,
        loading: false,
        error: null,
      })
    } catch (previewError) {
      const message =
        previewError instanceof Error
          ? previewError.message
          : 'Failed to load dataset preview.'
      setPreview({
        open: true,
        datasetName,
        rows: [],
        loading: false,
        error: message,
      })
    }
  }

  const previewColumns =
    preview.rows.length > 0 ? Object.keys(preview.rows[0]).slice(0, 12) : []

  return (
    <div className="min-h-full">
      <DashboardHeader
        title="Datasets"
        description="Persisted datasets for your account"
      />
      <main className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>All Datasets</CardTitle>
                <CardDescription>
                  {datasets.length} total datasets, {activeDatasetId ? '1 active' : 'none active'}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search datasets..."
                    className="w-full pl-9 sm:w-72"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
                <Button asChild>
                  <Link href="/upload">
                    <Plus className="mr-2 h-4 w-4" />
                    Upload
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading datasets...
              </div>
            ) : error ? (
              <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" onClick={() => void loadDatasets()}>
                  Retry
                </Button>
              </div>
            ) : filteredDatasets.length === 0 ? (
              <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border text-center">
                <Database className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No datasets found. Upload your first file to populate this table.
                </p>
                <Button asChild>
                  <Link href="/upload">Upload dataset</Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Rows</TableHead>
                      <TableHead className="text-right">Columns</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDatasets.map((dataset) => {
                      const isActive = dataset.id === activeDatasetId || dataset.isActive
                      const isActivating = activatingId === dataset.id

                      return (
                        <TableRow key={dataset.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium text-foreground">{dataset.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatBytes(dataset.sizeBytes)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isActive ? (
                              <Badge className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Ready</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {dataset.rowCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {dataset.columns.length}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{dataset.fileType}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(dataset.updatedAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handlePreview(dataset.id, dataset.name)}
                              >
                                <Eye className="mr-1 h-3.5 w-3.5" />
                                Preview
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => void handleActivate(dataset.id)}
                                disabled={isActive || isActivating}
                              >
                                {isActivating ? (
                                  <>
                                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                    Activating
                                  </>
                                ) : isActive ? (
                                  'Active'
                                ) : (
                                  'Activate'
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog
        open={preview.open}
        onOpenChange={(open) => setPreview((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Preview: {preview.datasetName}</DialogTitle>
            <DialogDescription>First 50 rows from persisted dataset storage.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-auto px-6 py-4">
            {preview.loading ? (
              <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading preview...
              </div>
            ) : preview.error ? (
              <p className="text-sm text-destructive">{preview.error}</p>
            ) : preview.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No preview rows available.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    <tr>
                      {previewColumns.map((column) => (
                        <th key={column} className="px-3 py-2 whitespace-nowrap">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, index) => (
                      <tr key={index} className="border-t">
                        {previewColumns.map((column) => (
                          <td key={`${index}-${column}`} className="px-3 py-2 align-top">
                            {formatCellValue(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
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

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}
