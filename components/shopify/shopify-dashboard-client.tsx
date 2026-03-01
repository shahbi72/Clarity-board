'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Bell, Loader2, RefreshCw } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type {
  BusinessStatusResponse,
  InsightEventsResponse,
  ShopifySummary,
  ShopifySummaryApiResponse,
  ShopifyTrendRangeDays,
} from '@/lib/types/shopify'

type ViewState = {
  loading: boolean
  error: string | null
  paywalled: boolean
  summary: ShopifySummary | null
}

type SpreadsheetItem = {
  id: string
  name: string
}

type SheetTab = {
  name: string
}

const DEFAULT_STATE: ViewState = {
  loading: true,
  error: null,
  paywalled: false,
  summary: null,
}

export function ShopifyDashboardClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isDemoMode = searchParams.get('demo') === '1'

  const [rangeDays, setRangeDays] = useState<ShopifyTrendRangeDays>(7)
  const [includeCancelled, setIncludeCancelled] = useState(false)
  const [state, setState] = useState<ViewState>(DEFAULT_STATE)

  const [businessStatus, setBusinessStatus] = useState<BusinessStatusResponse | null>(null)
  const [businessError, setBusinessError] = useState<string | null>(null)
  const [loadingBusiness, setLoadingBusiness] = useState(false)
  const [refreshingSheet, setRefreshingSheet] = useState(false)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetItem[]>([])
  const [sheetTabs, setSheetTabs] = useState<SheetTab[]>([])
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<SpreadsheetItem | null>(null)

  const [insightsOpen, setInsightsOpen] = useState(false)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [insights, setInsights] = useState<InsightEventsResponse['items']>([])

  const loadSummary = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }))

    const endpoint = isDemoMode ? '/api/shopify/demo-summary' : '/api/shopify/summary'
    const query = new URLSearchParams({
      rangeDays: String(rangeDays),
      includeCancelled: includeCancelled ? '1' : '0',
    })

    try {
      const response = await fetch(`${endpoint}?${query.toString()}`, { cache: 'no-store' })
      const payload = (await response.json()) as ShopifySummaryApiResponse

      if (response.status === 401 && !isDemoMode) {
        router.push('/login?next=/dashboard')
        return
      }

      if (!response.ok && response.status !== 402) {
        throw new Error(readApiError(payload) || 'Unable to load dashboard.')
      }

      setState({
        loading: false,
        error: payload.error ?? null,
        paywalled: payload.paywalled,
        summary: payload.summary ?? null,
      })
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Unable to load dashboard.',
        paywalled: false,
        summary: null,
      })
    }
  }, [includeCancelled, isDemoMode, rangeDays, router])

  const loadBusinessStatus = useCallback(async () => {
    if (isDemoMode) {
      setBusinessStatus(null)
      return
    }

    setLoadingBusiness(true)
    setBusinessError(null)

    try {
      const response = await fetch('/api/business/status', { cache: 'no-store' })
      const payload = (await response.json()) as BusinessStatusResponse | { error?: { message?: string } }

      if (response.status === 401) {
        router.push('/login?next=/dashboard')
        return
      }

      if (!response.ok) {
        throw new Error(readApiError(payload) || 'Unable to load business status.')
      }

      setBusinessStatus(payload as BusinessStatusResponse)
    } catch (error) {
      setBusinessError(error instanceof Error ? error.message : 'Unable to load business status.')
      setBusinessStatus(null)
    } finally {
      setLoadingBusiness(false)
    }
  }, [isDemoMode, router])

  const loadInsights = useCallback(async () => {
    if (isDemoMode || !businessStatus?.eligible) {
      return
    }

    setLoadingInsights(true)

    try {
      const response = await fetch('/api/business/insights?limit=20', { cache: 'no-store' })
      const payload = (await response.json()) as InsightEventsResponse | { error?: { message?: string } }
      if (!response.ok) {
        throw new Error(readApiError(payload) || 'Unable to load insights.')
      }

      const typedPayload = payload as InsightEventsResponse
      setInsights(typedPayload.items)
      setBusinessStatus((current) =>
        current
          ? {
              ...current,
              unreadCount: typedPayload.unreadCount,
            }
          : current
      )
    } catch (error) {
      setBusinessError(error instanceof Error ? error.message : 'Unable to load insights.')
    } finally {
      setLoadingInsights(false)
    }
  }, [businessStatus?.eligible, isDemoMode])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  useEffect(() => {
    void loadBusinessStatus()
  }, [loadBusinessStatus])

  useEffect(() => {
    if (insightsOpen) {
      void loadInsights()
    }
  }, [insightsOpen, loadInsights])

  const loadSpreadsheets = useCallback(async () => {
    try {
      const response = await fetch('/api/business/google/spreadsheets', { cache: 'no-store' })
      const payload = (await response.json()) as { items?: SpreadsheetItem[]; error?: { message?: string } }
      if (!response.ok) {
        throw new Error(readApiError(payload) || 'Unable to load spreadsheets.')
      }

      setSpreadsheets(payload.items ?? [])
    } catch (error) {
      setBusinessError(error instanceof Error ? error.message : 'Unable to load spreadsheets.')
    }
  }, [])

  const loadSheetTabs = useCallback(async (spreadsheet: SpreadsheetItem) => {
    setSelectedSpreadsheet(spreadsheet)
    setSheetTabs([])

    try {
      const response = await fetch(
        `/api/business/google/spreadsheets/${encodeURIComponent(spreadsheet.id)}/sheets`,
        { cache: 'no-store' }
      )
      const payload = (await response.json()) as { items?: SheetTab[]; error?: { message?: string } }
      if (!response.ok) {
        throw new Error(readApiError(payload) || 'Unable to load sheets.')
      }

      setSheetTabs(payload.items ?? [])
    } catch (error) {
      setBusinessError(error instanceof Error ? error.message : 'Unable to load sheets.')
    }
  }, [])

  const selectSheet = useCallback(
    async (sheetName: string) => {
      if (!selectedSpreadsheet) {
        return
      }

      try {
        const response = await fetch('/api/business/google/select', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            spreadsheetId: selectedSpreadsheet.id,
            spreadsheetName: selectedSpreadsheet.name,
            sheetName,
          }),
        })

        const payload = (await response.json()) as { error?: { message?: string } }
        if (!response.ok) {
          throw new Error(readApiError(payload) || 'Unable to save sheet selection.')
        }

        setPickerOpen(false)
        await loadBusinessStatus()
      } catch (error) {
        setBusinessError(error instanceof Error ? error.message : 'Unable to save sheet selection.')
      }
    },
    [loadBusinessStatus, selectedSpreadsheet]
  )

  const refreshConnectedSheet = useCallback(async () => {
    setRefreshingSheet(true)
    setBusinessError(null)

    try {
      const response = await fetch('/api/business/sync/refresh', {
        method: 'POST',
      })
      const payload = (await response.json()) as { error?: { message?: string } }
      if (!response.ok) {
        throw new Error(readApiError(payload) || 'Unable to refresh sheet.')
      }

      await Promise.all([loadSummary(), loadBusinessStatus(), loadInsights()])
    } catch (error) {
      setBusinessError(error instanceof Error ? error.message : 'Unable to refresh sheet.')
    } finally {
      setRefreshingSheet(false)
    }
  }, [loadBusinessStatus, loadInsights, loadSummary])

  const markAllInsightsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/business/insights/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ all: true }),
      })
      const payload = (await response.json()) as { unreadCount?: number; error?: { message?: string } }
      if (!response.ok) {
        throw new Error(readApiError(payload) || 'Unable to mark insights as read.')
      }

      setInsights((current) => current.map((item) => ({ ...item, readAt: new Date().toISOString() })))
      setBusinessStatus((current) =>
        current
          ? {
              ...current,
              unreadCount: payload.unreadCount ?? 0,
            }
          : current
      )
    } catch (error) {
      setBusinessError(error instanceof Error ? error.message : 'Unable to mark insights as read.')
    }
  }, [])

  const topProducts = useMemo(() => state.summary?.topProducts ?? [], [state.summary?.topProducts])
  const trendPoints = useMemo(() => state.summary?.trend ?? [], [state.summary?.trend])

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Shopify Orders Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {isDemoMode
            ? 'Demo data mode. Upload your own Shopify export to see your store.'
            : 'Upload Shopify Orders CSV and get instant clarity on what drives revenue.'}
        </p>
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <Button variant={rangeDays === 7 ? 'default' : 'outline'} onClick={() => setRangeDays(7)}>
          Last 7 days
        </Button>
        <Button variant={rangeDays === 30 ? 'default' : 'outline'} onClick={() => setRangeDays(30)}>
          Last 30 days
        </Button>
        <Button variant={includeCancelled ? 'default' : 'outline'} onClick={() => setIncludeCancelled((value) => !value)}>
          {includeCancelled ? 'Including cancelled orders' : 'Exclude cancelled orders'}
        </Button>
        {!isDemoMode ? (
          <Button variant="outline" asChild>
            <Link href="/upload">Upload new CSV</Link>
          </Button>
        ) : null}
      </section>

      {!isDemoMode ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Business Live Sync</CardTitle>
                <CardDescription>Google Sheets near-real-time polling plus notifications.</CardDescription>
              </div>
              {businessStatus?.eligible ? (
                <Button variant={insightsOpen ? 'default' : 'outline'} onClick={() => setInsightsOpen((value) => !value)}>
                  <Bell className="mr-2 h-4 w-4" />
                  Insights ({businessStatus.unreadCount})
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingBusiness ? <p className="text-sm text-muted-foreground">Loading business status...</p> : null}
            {businessError ? <p className="text-sm text-rose-700">{businessError}</p> : null}

            {!loadingBusiness && businessStatus && !businessStatus.eligible ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">Upgrade to Business to unlock live sync + notifications.</p>
                <p className="mt-1 text-sm text-amber-800">{businessStatus.message}</p>
                <div className="mt-3">
                  <Button asChild>
                    <Link href="/pricing?upgrade=business">Upgrade to Business</Link>
                  </Button>
                </div>
              </div>
            ) : null}

            {!loadingBusiness && businessStatus?.eligible ? (
              <div className="space-y-3 rounded-lg border border-border/70 p-4">
                {businessStatus.source.connected ? (
                  <>
                    <p className="text-sm font-medium">Connected source: Google Sheets</p>
                    <p className="text-sm text-muted-foreground">
                      {businessStatus.source.spreadsheetName} / {businessStatus.source.sheetName}
                    </p>
                    <p className="text-sm text-muted-foreground">Last sync: {formatDateTime(businessStatus.source.lastSyncedAt)}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => void refreshConnectedSheet()} disabled={refreshingSheet}>
                        {refreshingSheet ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Refreshing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh now
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => setPickerOpen((value) => !value)}>
                        Change sheet
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">Connect your sheet to enable live insights.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild>
                        <a href="/api/business/google/connect">Connect Google Sheets</a>
                      </Button>
                      <Button variant="outline" onClick={() => setPickerOpen((value) => !value)}>
                        Open picker
                      </Button>
                    </div>
                  </>
                )}

                {pickerOpen ? (
                  <div className="space-y-3 rounded-md border border-border p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => void loadSpreadsheets()}>
                        Load spreadsheets
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        {spreadsheets.map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            className="w-full rounded border p-2 text-left text-sm"
                            onClick={() => void loadSheetTabs(item)}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {selectedSpreadsheet ? (
                          <p className="text-xs text-muted-foreground">{selectedSpreadsheet.name}</p>
                        ) : null}
                        {sheetTabs.map((tab) => (
                          <div key={tab.name} className="rounded border p-2">
                            <p className="text-sm">{tab.name}</p>
                            <Button size="sm" className="mt-2" onClick={() => void selectSheet(tab.name)}>
                              Use this sheet
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {insightsOpen ? (
                  <div className="space-y-2 rounded-md border border-border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Insight notifications</p>
                      <Button size="sm" variant="outline" onClick={() => void markAllInsightsRead()}>
                        Mark all read
                      </Button>
                    </div>
                    {loadingInsights ? <p className="text-sm text-muted-foreground">Loading insights...</p> : null}
                    {!loadingInsights && insights.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No insights yet.</p>
                    ) : null}
                    {insights.map((item) => (
                      <div key={item.id} className="rounded border p-2">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)} | {item.severity}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {state.loading ? (
        <Card>
          <CardContent className="flex min-h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading dashboard...
          </CardContent>
        </Card>
      ) : null}

      {!state.loading && state.error ? (
        <Card className="border-rose-300 bg-rose-50">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-rose-900">
              <AlertCircle className="h-4 w-4" />
              Dashboard unavailable
            </CardTitle>
            <CardDescription className="text-rose-800">{state.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!state.loading && state.paywalled ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">Trial expired</CardTitle>
            <CardDescription className="text-amber-800">
              Your 7-day trial ended. Subscribe to keep using the Shopify dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/pricing">View plans</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!state.loading && !state.paywalled && state.summary && !state.summary.hasData ? (
        <Card>
          <CardHeader>
            <CardTitle>No Shopify data yet</CardTitle>
            <CardDescription>Upload a Shopify Orders CSV to view your metrics.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/upload">Upload Shopify Orders CSV</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!state.loading && !state.paywalled && state.summary && state.summary.hasData ? (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Total Revenue" value={formatCurrency(state.summary.totals.totalRevenue)} />
            <MetricCard title="Total Orders" value={state.summary.totals.totalOrders.toLocaleString()} />
            <MetricCard title="AOV" value={formatCurrency(state.summary.totals.averageOrderValue)} />
            <MetricCard title="Units Sold" value={state.summary.totals.totalUnitsSold.toLocaleString()} />
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Last {state.summary.rangeDays} days</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendPoints}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="revenue" strokeWidth={2} stroke="hsl(var(--primary))" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 5 Products by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Product Name</th>
                      <th className="py-2 pr-4 font-medium">Units Sold</th>
                      <th className="py-2 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product) => (
                      <tr key={`${product.sku ?? 'nosku'}-${product.productName}`} className="border-b border-border/50">
                        <td className="py-3 pr-4">{product.productName}</td>
                        <td className="py-3 pr-4">{product.unitsSold.toLocaleString()}</td>
                        <td className="py-3">{formatCurrency(product.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </main>
  )
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Never'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function readApiError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const value = (payload as { error?: unknown }).error
  if (typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object') {
    const message = (value as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return null
}
