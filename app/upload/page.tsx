'use client'

import { useRouter } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { DatasetUploader } from '@/components/data/dataset-uploader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { UploadDatasetResponse } from '@/lib/types/data-pipeline'
import {
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  ShieldCheck,
  DatabaseZap,
} from 'lucide-react'

const supportedFormats = [
  {
    name: 'Spreadsheets',
    formats: 'CSV, Excel (.xlsx, .xls)',
    icon: FileSpreadsheet,
    description: 'Sales data, inventory lists, financial reports',
  },
  {
    name: 'Documents',
    formats: 'PDF, TXT',
    icon: FileText,
    description: 'Invoices, receipts, contracts',
  },
]

const safeguards = [
  {
    icon: ShieldCheck,
    title: 'Safe parsing',
    description: 'File type and size are validated before persistence.',
  },
  {
    icon: DatabaseZap,
    title: 'Persistent storage',
    description: 'Datasets are stored server-side and survive refresh/restart.',
  },
  {
    icon: CheckCircle2,
    title: 'Activation ready',
    description: 'New uploads become available instantly on Dashboard and Datasets.',
  },
]

export default function UploadPage() {
  const router = useRouter()

  const handleSuccess = (payload: UploadDatasetResponse) => {
    const params = new URLSearchParams({
      uploaded: '1',
      dataset: payload.datasetName,
    })
    router.push(`/datasets?${params.toString()}`)
  }

  return (
    <div className="min-h-full">
      <DashboardHeader
        title="Upload Data"
        description="Upload CSV/XLSX and persist it as a reusable dataset"
      />
      <main className="flex-1 p-4 md:p-6">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="space-y-6">
            <DatasetUploader onUploadSuccess={handleSuccess} />
          </section>

          <section className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Supported Formats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {supportedFormats.map((format) => (
                  <div key={format.name} className="flex items-start gap-3">
                    <div className="rounded-lg bg-muted p-2">
                      <format.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{format.name}</p>
                      <p className="text-xs text-muted-foreground">{format.formats}</p>
                      <p className="text-xs text-muted-foreground/70">{format.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pipeline Guarantees</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {safeguards.map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}
