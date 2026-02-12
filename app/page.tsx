'use client'

import React from 'react'
import CsvUpload from '@/components/data/csv-upload'
import CsvPreview from '@/components/CsvPreview'
import CsvDataTable from '@/components/CsvDataTable'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { DatasetStatus } from '@/components/dashboard/dataset-status'
import { KPICards } from '@/components/dashboard/kpi-cards'
import { AIAssistantCard } from '@/components/dashboard/ai-assistant-card'
import { NotificationsPanel } from '@/components/dashboard/notifications-panel'
import dynamic from 'next/dynamic'
import { SuggestionsPanel } from '@/components/dashboard/suggestions-panel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { calcDailyMetrics } from '@/lib/metrics'
import {
  mockChartData,
  mockDatasets,
  mockKPIData,
  mockNotifications,
  mockSuggestions,
  type ChartDataPoint,
  type KPIData,
} from '@/lib/mock-data'

const RevenueChart = dynamic(
  () =>
    import('@/components/dashboard/revenue-chart').then(
      (mod) => mod.RevenueChart
    ),
  { ssr: false }
)

type Tx = {
  amount: number
  type: 'revenue' | 'expense'
  productName?: string
  date?: string
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
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

export default function Page() {
  const [txs, setTxs] = React.useState<Tx[]>([])

  const totals = React.useMemo(() => {
    let revenue = 0
    let expense = 0
    for (const tx of txs) {
      if (tx.type === 'expense') expense += tx.amount
      else revenue += tx.amount
    }
    return { revenue, expense, net: revenue - expense, count: txs.length }
  }, [txs])

  const insight = React.useMemo(() => calcDailyMetrics(txs), [txs])
  const insightMessage = React.useMemo(() => buildInsightMessage(txs), [txs])

  const kpiData = React.useMemo<KPIData>(() => {
    if (txs.length === 0) return mockKPIData
    const profit = totals.net
    const loss = profit < 0 ? Math.abs(profit) : 0

    return {
      totalRevenue: totals.revenue,
      totalExpenses: totals.expense,
      totalProfit: totals.net,
      totalLoss: loss,
      todayRevenue: totals.revenue,
      todayExpenses: totals.expense,
      todayProfit: totals.net,
      todayLoss: loss,
      weeklyProfit: totals.net,
      monthlyProfit: totals.net,
      revenueChange: 0,
      expensesChange: 0,
      profitChange: 0,
    }
  }, [totals, txs.length])

  const chartData = React.useMemo<ChartDataPoint[]>(() => {
    if (txs.length === 0) return mockChartData

    const buckets = new Map<
      string,
      { revenue: number; expenses: number; timestamp: number }
    >()

    for (const tx of txs) {
      if (!tx.date) continue
      const parsedDate = new Date(tx.date)
      const isValidDate = !Number.isNaN(parsedDate.getTime())
      const label = isValidDate
        ? parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : tx.date
      const timestamp = isValidDate ? parsedDate.getTime() : 0
      const bucket = buckets.get(label) ?? { revenue: 0, expenses: 0, timestamp }

      if (tx.type === 'expense') bucket.expenses += tx.amount
      else bucket.revenue += tx.amount

      buckets.set(label, bucket)
    }

    if (buckets.size === 0) return mockChartData

    return Array.from(buckets.entries())
      .map(([date, values]) => ({
        date,
        revenue: Math.round(values.revenue),
        expenses: Math.round(values.expenses),
        profit: Math.round(values.revenue - values.expenses),
        timestamp: values.timestamp,
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(({ timestamp: _timestamp, ...rest }) => rest)
  }, [txs])

  return (
    <SidebarProvider>
      <div className="relative min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="bg-transparent">
          <main className="relative mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
            <section className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 shadow-sm elite-rise">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                  <div className="md:hidden">
                    <SidebarTrigger className="h-9 w-9 rounded-full border border-border bg-white" />
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Business snapshot
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Good morning, Shahbaz
                  </h1>
                  <p className="text-sm text-muted-foreground sm:text-base">
                    Track cash flow, invoices, and expenses with a clean bookkeeping overview.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="secondary"
                    className="rounded-full border border-border bg-white text-xs font-semibold"
                  >
                    Connect bank
                  </Button>
                  <Button className="rounded-full text-xs font-semibold">
                    Create invoice
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="text-xs text-muted-foreground">Cash in today</div>
                  <div className="text-xl font-semibold">{formatMoney(totals.revenue)}</div>
                </div>
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="text-xs text-muted-foreground">Cash out today</div>
                  <div className="text-xl font-semibold">{formatMoney(totals.expense)}</div>
                </div>
                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
                  <div className="text-xs text-muted-foreground">Net cash</div>
                  <div className="text-xl font-semibold">{formatMoney(totals.net)}</div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] elite-rise" style={{ animationDelay: '0.05s' }}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/clarityboard-logo.png"
                    alt="Clarityboard"
                    className="h-8 w-auto"
                  />
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Clarityboard
                    </div>
                    <div className="text-sm font-semibold">Daily cash flow</div>
                  </div>
                </div>

                <Card className="border-border/60 bg-card shadow-sm elite-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Today&apos;s insight
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm font-medium">
                    <p>{insightMessage}</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                        <div className="text-muted-foreground">Transactions</div>
                        <div className="text-base font-semibold">{totals.count}</div>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                        <div className="text-muted-foreground">Top product</div>
                        <div className="text-base font-semibold">
                          {insight.topProductName ?? '\u2014'}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-primary/10 p-3 text-xs">
                        <div className="text-muted-foreground">Profit</div>
                        <div className="text-base font-semibold">{formatMoney(insight.profit)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/60 bg-card shadow-sm elite-card">
                <CardHeader className="pb-3">
                  <CardTitle>Import transactions</CardTitle>
                  <CardDescription>
                    Upload a CSV to refresh your cash flow and KPIs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CsvUpload onLoaded={setTxs} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                      <div className="text-muted-foreground">Transactions</div>
                      <div className="text-base font-semibold">{totals.count}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                      <div className="text-muted-foreground">Net cash</div>
                      <div className="text-base font-semibold">{formatMoney(totals.net)}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                      <div className="text-muted-foreground">Cash in</div>
                      <div className="text-base font-semibold">{formatMoney(totals.revenue)}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                      <div className="text-muted-foreground">Cash out</div>
                      <div className="text-base font-semibold">{formatMoney(totals.expense)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-6 lg:grid-cols-[2fr_1fr] elite-rise" style={{ animationDelay: '0.1s' }}>
              <RevenueChart data={chartData} />
              <div className="space-y-6">
                <AIAssistantCard />
                <NotificationsPanel notifications={mockNotifications} />
                <DatasetStatus datasets={mockDatasets} />
                <SuggestionsPanel suggestions={mockSuggestions} />
              </div>
            </section>

            <section className="space-y-4 elite-rise" style={{ animationDelay: '0.15s' }}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">Profitability KPIs</h3>
                  <p className="text-sm text-muted-foreground">
                    KPIs update from your upload or show sample context.
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Updated {txs.length > 0 ? 'from your latest upload' : 'with sample data'}
                </div>
              </div>
              <KPICards data={kpiData} timeFilter="week" />
            </section>

            <section className="grid gap-6 lg:grid-cols-3 elite-rise" style={{ animationDelay: '0.2s' }}>
              <div className="space-y-6 lg:col-span-3">
                <Card className="border-border/60 bg-card shadow-sm elite-card">
                  <CardHeader className="pb-3">
                    <CardTitle>Preview</CardTitle>
                    <CardDescription>Cleaned sample of your latest rows.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CsvPreview txs={txs} />
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-card shadow-sm elite-card">
                  <CardHeader className="pb-3">
                    <CardTitle>Transactions</CardTitle>
                    <CardDescription>Full table view of your imported data.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CsvDataTable txs={txs} />
                  </CardContent>
                </Card>
              </div>
            </section>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
