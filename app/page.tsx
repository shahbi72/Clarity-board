'use client'

import React from 'react'
import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Database,
  Loader2,
  RefreshCw,
  UploadCloud,
  Wallet,
  TrendingDown,
  TrendingUp,
  Landmark,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DatasetUploader } from '@/components/data/dataset-uploader'
import { useToast } from '@/hooks/use-toast'
import type {
  DashboardSummaryResponse,
  DataRow,
  UploadDatasetResponse,
} from '@/lib/types/data-pipeline'

const PIE_COLORS = ['#2563eb', '#0ea5e9', '#14b8a6', '#6366f1', '#f59e0b', '#ef4444']

export default function DashboardPage() {
  const { toast } = useToast()
  const [summary, setSummary] = React.useState<DashboardSummaryResponse | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const loadSummary = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/dashboard/summary', { cache: 'no-store' })
      const payload = (await response.json()) as DashboardSummaryResponse | { error?: string }
      if (!response.ok) {
        throw new Error(
          payload && typeof payload === 'object' && 'error' in payload
            ? payload.error || 'Failed to load dashboard.'
            : 'Failed to load dashboard.'
        )
      }

      setSummary(payload as DashboardSummaryResponse)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load dashboard.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  const handleUploadSuccess = (payload: UploadDatasetResponse) => {
    toast({
      title: 'Dataset uploaded',
      description: `${payload.datasetName} is now active on your dashboard.`,
    })
    void loadSummary()
  }

  const previewColumns = React.useMemo(() => {
    const firstRow = summary?.previewRows?.[0]
    if (firstRow) {
      return Object.keys(firstRow).slice(0, 12)
    }
    return summary?.dataset?.columns?.slice(0, 12) ?? []
  }, [summary])

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <Card className="min-h-56">
          <CardContent className="flex h-full min-h-56 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading dashboard...
          </CardContent>
        </Card>
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void loadSummary()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!summary || !summary.dataset) {
    return (
      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              No Active Dataset
            </CardTitle>
            <CardDescription>
              Select an active dataset from Datasets, or upload one to automatically activate it.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/upload">
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload data
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/datasets">Open datasets</Link>
            </Button>
          </CardContent>
        </Card>

        <DatasetUploader onUploadSuccess={handleUploadSuccess} />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Active Dataset
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{summary.dataset.name}</h1>
          <p className="text-sm text-muted-foreground">
            {summary.metrics.rowCount.toLocaleString()} rows • {summary.metrics.columnCount} columns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{summary.dataset.fileType}</Badge>
          <Button variant="outline" onClick={() => void loadSummary()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={summary.metrics.totalRevenue}
          icon={TrendingUp}
          tone="text-emerald-700"
        />
        <MetricCard
          title="Total Expenses"
          value={summary.metrics.totalExpenses}
          icon={TrendingDown}
          tone="text-rose-700"
        />
        <MetricCard
          title="Net Profit"
          value={summary.metrics.netProfit}
          icon={Wallet}
          tone={summary.metrics.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}
        />
        <MetricCard
          title="Cash In/Out"
          value={summary.metrics.cashIn - summary.metrics.cashOut}
          subtitle={`${formatCurrency(summary.metrics.cashIn)} in • ${formatCurrency(summary.metrics.cashOut)} out`}
          icon={Landmark}
          tone="text-slate-700"
          valueTestId="dashboard-upload-transactions"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Revenue vs Expenses (Monthly)</CardTitle>
            <CardDescription>
              Trend view using mapped date + amount columns.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {summary.charts.monthlySeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary.charts.monthlySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(value) => compactCurrency(value)} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <FallbackText message={summary.fallback.monthlySeries} />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Top Products / Categories</CardTitle>
            <CardDescription>
              Highest contributors based on mapped product/customer/category columns.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {summary.charts.topItems.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.charts.topItems}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" interval={0} angle={-20} height={70} textAnchor="end" />
                  <YAxis tickFormatter={(value) => compactCurrency(value)} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <FallbackText message={summary.fallback.topItems} />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>Category split of detected expenses.</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {summary.charts.expenseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Pie
                    data={summary.charts.expenseBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={56}
                    paddingAngle={3}
                  >
                    {summary.charts.expenseBreakdown.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <FallbackText message={summary.fallback.expenseBreakdown} />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Upload and Recompute</CardTitle>
            <CardDescription>
              Uploading here persists the dataset and refreshes dashboard immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DatasetUploader onUploadSuccess={handleUploadSuccess} submitLabel="Upload & refresh" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest rows sorted by date (or row order fallback).</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Not enough data to build a transaction table yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2 text-right">Revenue</th>
                      <th className="px-3 py-2 text-right">Expense</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recentTransactions.map((transaction) => (
                      <tr key={transaction.rowIndex} className="border-t">
                        <td className="px-3 py-2">{transaction.date ?? '-'}</td>
                        <td className="px-3 py-2">{transaction.description ?? '-'}</td>
                        <td className="px-3 py-2">{transaction.category ?? '-'}</td>
                        <td className="px-3 py-2 capitalize">{transaction.type}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(transaction.revenue)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(transaction.expense)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Dataset Preview</CardTitle>
            <CardDescription>Always available fallback when chart mapping is incomplete.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Columns</div>
              <div className="flex flex-wrap gap-2">
                {summary.dataset.columns.slice(0, 16).map((column) => (
                  <Badge key={column} variant="outline">
                    {column}
                  </Badge>
                ))}
              </div>
            </div>

            {summary.previewRows.length > 0 ? (
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
                    {summary.previewRows.slice(0, 10).map((row, index) => (
                      <tr key={index} className="border-t">
                        {previewColumns.map((column) => (
                          <td key={`${index}-${column}`} className="px-3 py-2">
                            {formatCellValue((row as DataRow)[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No preview rows available.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
  tone,
  icon: Icon,
  valueTestId,
}: {
  title: string
  value: number
  subtitle?: string
  tone?: string
  icon: React.ComponentType<{ className?: string }>
  valueTestId?: string
}) {
  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold ${tone ?? 'text-foreground'}`} data-testid={valueTestId}>
          {formatCurrency(value)}
        </div>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

function FallbackText({ message }: { message: string | null }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 text-center text-sm text-muted-foreground">
      {message ?? 'Not enough data for this chart.'}
    </div>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function compactCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function formatCellValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}
