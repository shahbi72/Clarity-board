'use client'

import React from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import CsvUpload from '@/components/data/csv-upload'
import CsvPreview from '@/components/CsvPreview'
import CsvDataTable from '@/components/CsvDataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { calcDailyMetrics } from '@/lib/metrics'
import {
  FileSpreadsheet,
  FileText,
  FileImage,
  FileJson,
  CheckCircle2,
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
  {
    name: 'Data Files',
    formats: 'JSON',
    icon: FileJson,
    description: 'API exports, database dumps',
  },
  {
    name: 'Images',
    formats: 'PNG, JPG, JPEG',
    icon: FileImage,
    description: 'Receipts, documents, charts',
  },
]

const features = [
  'Automatic data cleaning and normalization',
  'Smart column detection and categorization',
  'Duplicate removal and validation',
  'AI-powered data extraction from PDFs and images',
]

type Tx = {
  amount: number
  type: 'revenue' | 'expense'
  productName?: string
  date?: string
}

function formatMoney(value: number): string {
  return value.toFixed(2)
}

function buildInsightMessage(txs: Tx[]): string {
  if (txs.length === 0) return "Upload a CSV to see today's insight."
  const insight = calcDailyMetrics(txs)

  const profitText = `Today your profit is ${formatMoney(insight.profit)}.`
  const summaryText = `Revenue ${formatMoney(insight.revenue)} vs expenses ${formatMoney(
    insight.expenses
  )}.`

  if (!insight.topProductName) return `${profitText} ${summaryText}`

  const topText =
    insight.topProductRevenue != null
      ? `${insight.topProductName} leads with ${formatMoney(insight.topProductRevenue)} in revenue.`
      : `${insight.topProductName} is your best-performing product.`

  return `${profitText} ${summaryText} ${topText}`
}

export default function UploadPage() {
  const [txs, setTxs] = React.useState<Tx[]>([])
  const dashboardRef = React.useRef<HTMLDivElement | null>(null)

  const totals = React.useMemo(() => {
    let revenue = 0
    let expense = 0
    for (const tx of txs) {
      if (tx.type === 'expense') expense += tx.amount
      else revenue += tx.amount
    }
    return { revenue, expense, net: revenue - expense, count: txs.length }
  }, [txs])

  const insightMessage = React.useMemo(() => buildInsightMessage(txs), [txs])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!txs.length) return
      const isShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        (event.code === 'KeyD' || event.key.toLowerCase() === 'd')
      if (!isShortcut) return
      event.preventDefault()
      event.stopPropagation()
      dashboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [txs.length])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader
          title="Upload Data"
          description="Upload any file type and we'll handle the rest"
        />
        <main className="flex-1 p-4 md:p-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Upload Area */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                <CsvUpload onLoaded={setTxs} />
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={txs.length === 0}
                    onClick={() =>
                      dashboardRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      })
                    }
                  >
                    Open Dashboard
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Shortcut: Ctrl + Shift + D
                  </span>
                  {txs.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      Upload data to enable.
                    </span>
                  )}
                </div>

                <div ref={dashboardRef} className="space-y-6">
                  <div className="rounded-xl border p-4 text-sm">
                    <div className="text-muted-foreground">Insight</div>
                    <div className="mt-1 font-medium">{insightMessage}</div>
                  </div>

                  <div className="rounded-xl border p-4 text-sm">
                    <div>Rows: {totals.count}</div>
                    <div>Revenue: {totals.revenue.toFixed(2)}</div>
                    <div>Expense: {totals.expense.toFixed(2)}</div>
                    <div>Net: {totals.net.toFixed(2)}</div>
                  </div>

                  <CsvPreview txs={txs} />

                  <CsvDataTable txs={txs} />
                </div>
              </div>
            </div>

            {/* Sidebar Info */}
            <div className="space-y-6">
              {/* Supported Formats */}
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
                        <p className="text-sm font-medium text-foreground">
                          {format.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format.formats}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          {format.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* What We Do */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">What We Do</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      <p className="text-sm text-muted-foreground">{feature}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
