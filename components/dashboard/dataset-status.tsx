'use client'

import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Upload,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { Dataset } from '@/lib/mock-data'

interface DatasetStatusProps {
  datasets: Dataset[]
}

const statusConfig = {
  uploaded: {
    icon: Upload,
    label: 'Uploaded',
    chip: 'icon-chip icon-chip-muted',
  },
  cleaning: {
    icon: Sparkles,
    label: 'Cleaning',
    chip: 'icon-chip icon-chip-accent',
  },
  processing: {
    icon: Loader2,
    label: 'Processing',
    chip: 'icon-chip icon-chip-primary',
  },
  ready: {
    icon: CheckCircle2,
    label: 'Ready',
    chip: 'icon-chip icon-chip-primary',
  },
  error: {
    icon: AlertCircle,
    label: 'Error',
    chip: 'icon-chip icon-chip-accent',
  },
}

export function DatasetStatus({ datasets }: DatasetStatusProps) {
  const statusCounts = {
    ready: datasets.filter((d) => d.status === 'ready').length,
    processing: datasets.filter((d) => d.status === 'processing' || d.status === 'cleaning').length,
    pending: datasets.filter((d) => d.status === 'uploaded').length,
    error: datasets.filter((d) => d.status === 'error').length,
  }

  const totalProgress = ((statusCounts.ready / datasets.length) * 100) || 0

  return (
    <Card className="border-border/60 bg-card shadow-sm elite-card">
      <CardHeader>
        <CardTitle>Dataset Status</CardTitle>
        <CardDescription>Overview of your uploaded datasets</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Processing Progress</span>
            <span className="font-medium text-foreground">{statusCounts.ready}/{datasets.length} ready</span>
          </div>
          <Progress value={totalProgress} className="h-2" />
        </div>

        <div className="space-y-3">
          {datasets.slice(0, 4).map((dataset) => {
            const status = statusConfig[dataset.status]
            const StatusIcon = status.icon
            const isAnimating = dataset.status === 'cleaning' || dataset.status === 'processing'

            return (
              <div
                key={dataset.id}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`${status.chip} h-8 w-8`}>
                    <StatusIcon
                      className={`h-3.5 w-3.5 ${isAnimating ? 'animate-spin' : ''}`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{dataset.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {dataset.fileType} - {dataset.lastUpdated}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {status.label}
                </span>
              </div>
            )
          })}
        </div>

        {datasets.length > 4 && (
          <p className="text-center text-xs text-muted-foreground">
            +{datasets.length - 4} more datasets
          </p>
        )}
      </CardContent>
    </Card>
  )
}
