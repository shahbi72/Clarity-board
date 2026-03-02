'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Bell, Info, Loader2, RefreshCw } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ShopifyAiCopilot } from '@/components/shopify/shopify-ai-copilot'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { calculateStoreHealthScore } from '@/lib/shopify/health-score'
import { buildDashboardInsightCards } from '@/lib/shopify/insights'
import { calculateProfitEstimate } from '@/lib/shopify/profit'
import type {
  BusinessStatusResponse,
  EffectivePlan,
  InsightEventsResponse,
  ShopifyCopilotContextPacket,
  ShopifySummary,
  ShopifySummaryApiResponse,
  ShopifyTopProduct,
  ShopifyTrendRangeDays,
} from '@/lib/types/shopify'

type ViewState = {
  loading: boolean
  error: string | null
  paywalled: boolean
  summary: ShopifySummary | null
  plan: EffectivePlan | null
}

type SpreadsheetItem = {
  id: string
  name: string
}

type SheetTab = {
  name: string
}

type DashboardDisplayInsight = {
  type: string
  title: string
  body: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
}

const DEFAULT_STATE: ViewState = {
  loading: true,
  error: null,
  paywalled: false,
  summary: null,
  plan: null,
}

const DEFAULT_FEE_PERCENT = '2.9'
const DEFAULT_FIXED_FEE = '0.30'

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
  const [feePercentInput, setFeePercentInput] = useState(DEFAULT_FEE_PERCENT)
  const [fixedFeePerOrderInput, setFixedFeePerOrderInput] = useState(DEFAULT_FIXED_FEE)
  const [averageShippingPerOrderInput, setAverageShippingPerOrderInput] = useState('')
  const [productCostInputs, setProductCostInputs] = useState<Record<string, string>>({})

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
        plan: payload.plan ?? null,
      })
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Unable to load dashboard.',
        paywalled: false,
        summary: null,
        plan: null,
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

  useEffect(() => {
    if (!isDemoMode && businessStatus?.eligible) {
      void loadInsights()
    }
  }, [businessStatus?.eligible, isDemoMode, loadInsights])

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

  const summary = state.summary
  const topProducts = useMemo(() => summary?.topProducts ?? [], [summary?.topProducts])
  const trendPoints = useMemo(() => summary?.trend ?? [], [summary?.trend])
  const deadStockItems = useMemo(() => summary?.deadStock.items ?? [], [summary?.deadStock.items])
  const ordersByDay = useMemo(() => summary?.salesTiming.ordersByDay ?? [], [summary?.salesTiming.ordersByDay])
  const ordersByHour = useMemo(() => summary?.salesTiming.ordersByHour ?? [], [summary?.salesTiming.ordersByHour])

  const feePercent = useMemo(() => parseOptionalNumber(feePercentInput) ?? 0, [feePercentInput])
  const fixedFeePerOrder = useMemo(() => parseOptionalNumber(fixedFeePerOrderInput) ?? 0, [fixedFeePerOrderInput])
  const averageShippingPerOrder = useMemo(
    () => parseOptionalNumber(averageShippingPerOrderInput) ?? 0,
    [averageShippingPerOrderInput]
  )

  const productCosts = useMemo(() => {
    const next: Record<string, number> = {}
    for (const product of topProducts) {
      const key = productIdentity(product)
      const parsed = parseOptionalNumber(productCostInputs[key] ?? '')
      if (parsed != null && parsed >= 0) {
        next[key] = parsed
      }
    }
    return next
  }, [productCostInputs, topProducts])

  const hasAnyCostInput = Object.keys(productCosts).length > 0
  const hasAnyShippingInput = averageShippingPerOrder > 0
  const hasCustomFeeInput =
    Math.abs(feePercent - Number(DEFAULT_FEE_PERCENT)) > 0.0001 ||
    Math.abs(fixedFeePerOrder - Number(DEFAULT_FIXED_FEE)) > 0.0001
  const profitConfigured = hasAnyCostInput || hasAnyShippingInput || hasCustomFeeInput

  const profitEstimate = useMemo(() => {
    if (!summary || !profitConfigured) {
      return null
    }

    const products = topProducts.map((product) => ({
      key: productIdentity(product),
      productName: product.productName,
      unitsSold: product.unitsSold,
      revenue: product.revenue,
    }))

    return calculateProfitEstimate({
      grossRevenue: summary.totals.totalRevenue + summary.totals.totalRefunded,
      refunded: summary.totals.totalRefunded,
      totalOrders: summary.totals.totalOrders,
      totalUnitsSold: summary.totals.totalUnitsSold,
      feePercent,
      fixedFeePerOrder,
      avgShippingPerOrder: averageShippingPerOrder,
      productCosts,
      products,
    })
  }, [
    averageShippingPerOrder,
    feePercent,
    fixedFeePerOrder,
    productCosts,
    profitConfigured,
    summary,
    topProducts,
  ])

  const estimatedProfitValue = profitEstimate?.estimatedProfit ?? summary?.totals.estimatedProfit ?? null
  const marginPct = profitEstimate?.marginPct ?? null

  const topProductsWithProfit = useMemo(() => {
    const profitMap = new Map(profitEstimate?.products.map((item) => [item.key, item]))

    return topProducts.map((product) => {
      const key = productIdentity(product)
      const profitRow = profitMap.get(key)
      return {
        ...product,
        estimatedProfit: profitRow?.estimatedProfit ?? null,
        marginPct: profitRow?.marginPct ?? null,
      }
    })
  }, [profitEstimate?.products, topProducts])

  const problemInsights = useMemo(() => {
    if (!summary) {
      return []
    }

    return buildDashboardInsightCards({
      summary,
      profit: profitEstimate
        ? {
            marginPct: profitEstimate.marginPct,
            previousMarginPct: summary.comparison7d.previous.marginPct,
            lowMarginProductCount: profitEstimate.lowMarginProducts.length,
          }
        : undefined,
    })
  }, [profitEstimate, summary])

  const headlineInsights = useMemo<DashboardDisplayInsight[]>(() => {
    if (!summary) {
      return []
    }

    if (!isDemoMode && businessStatus?.eligible && insights.length > 0) {
      return insights.slice(0, 6).map((item) => ({
        type: item.type,
        title: item.title,
        body: item.body,
        severity: item.severity,
      }))
    }

    return problemInsights.map((item) => ({
      type: item.type,
      title: item.title,
      body: item.body,
      severity:
        item.severity === 'HIGH'
          ? ('CRITICAL' as const)
          : item.severity === 'MED'
            ? ('WARNING' as const)
            : ('INFO' as const),
    }))
  }, [businessStatus?.eligible, insights, isDemoMode, problemInsights, summary])

  const storeHealth = useMemo(() => {
    if (!summary) {
      return null
    }

    return calculateStoreHealthScore({
      summary,
      marginPct,
    })
  }, [marginPct, summary])

  const healthWhyTooltip = useMemo(() => {
    if (!storeHealth) {
      return ''
    }

    return storeHealth.factors
      .map((factor) => `${factor.label}: ${factor.score}/${factor.maxScore} - ${factor.reason}`)
      .join('\n')
  }, [storeHealth])

  const copilotContext = useMemo<ShopifyCopilotContextPacket | null>(() => {
    if (!summary) {
      return null
    }

    const insightContext =
      insights.length > 0
        ? insights.slice(0, 5).map((item) => ({
            type: item.type,
            title: item.title,
            body: item.body,
            severity: item.severity,
            deltaJson: item.deltaJson,
          }))
        : problemInsights.slice(0, 5).map((item) => ({
            type: item.type,
            title: item.title,
            body: item.body,
            severity:
              item.severity === 'HIGH'
                ? ('CRITICAL' as const)
                : item.severity === 'MED'
                  ? ('WARNING' as const)
                  : ('INFO' as const),
            deltaJson: null,
          }))

    return {
      comparison7d: {
        current: summary.comparison7d.current,
        previous: summary.comparison7d.previous,
        deltas: {
          ...summary.comparison7d.deltas,
          revenueDelta: summary.comparison7d.current.revenue - summary.comparison7d.previous.revenue,
          ordersDelta: summary.comparison7d.current.orders - summary.comparison7d.previous.orders,
          averageOrderValueDelta:
            summary.comparison7d.current.averageOrderValue - summary.comparison7d.previous.averageOrderValue,
          unitsSoldDelta: summary.comparison7d.current.unitsSold - summary.comparison7d.previous.unitsSold,
          refundedDelta: summary.comparison7d.current.refunded - summary.comparison7d.previous.refunded,
        },
      },
      kpis: {
        totalRevenue: summary.totals.totalRevenue,
        totalOrders: summary.totals.totalOrders,
        averageOrderValue: summary.totals.averageOrderValue,
        totalUnitsSold: summary.totals.totalUnitsSold,
        totalRefunded: summary.totals.totalRefunded,
      },
      topProducts: summary.topProducts,
      topSkuDeclines: summary.comparison7d.topSkuDeclines,
      profit: {
        estimatedProfit: estimatedProfitValue,
        marginPct,
        lowMarginProducts:
          profitEstimate?.lowMarginProducts.map((item) => ({
            productName: item.productName,
            marginPct: item.marginPct ?? 0,
          })) ?? [],
      },
      insights: insightContext,
    }
  }, [estimatedProfitValue, insights, marginPct, problemInsights, profitEstimate?.lowMarginProducts, summary])

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Shopify Store Health Monitor</h1>
          <p className="text-sm text-muted-foreground">
            {isDemoMode
              ? 'Demo data mode. Upload your own Shopify export to see your store.'
              : 'Problem-first dashboard for revenue, risk, and profit clarity.'}
          </p>
        </div>
        {!isDemoMode && businessStatus?.eligible ? (
          <Button variant={insightsOpen ? 'default' : 'outline'} onClick={() => setInsightsOpen((value) => !value)}>
            <Bell className="mr-2 h-4 w-4" />
            Notifications ({businessStatus.unreadCount})
          </Button>
        ) : null}
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
            <CardTitle>Business Live Sync</CardTitle>
            <CardDescription>Google Sheets near-real-time polling plus notifications.</CardDescription>
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
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{item.title}</p>
                          <span className={severityBadgeClass(item.severity)}>{item.severity}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                        <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{item.body}</p>
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
              Your 7-day trial ended. Subscribe to keep using the Shopify dashboard, AI Copilot, and sync features.
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

      {!state.loading && !state.paywalled && summary && summary.hasData ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            {storeHealth ? (
              <section className="grid gap-4 xl:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Store Health Score</CardDescription>
                    <CardTitle className="flex items-start justify-between gap-2">
                      <span className="text-4xl font-semibold leading-none">{storeHealth.score}</span>
                      {healthWhyTooltip ? (
                        <button
                          type="button"
                          title={healthWhyTooltip}
                          aria-label="Why this score"
                          className="rounded-md border border-border/70 p-1 text-muted-foreground"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      ) : null}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className={`text-sm font-medium ${healthLabelClass(storeHealth.label)}`}>
                      {storeHealth.label}
                    </p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {storeHealth.factors.slice(0, 3).map((factor) => (
                        <p key={factor.id}>
                          {factor.label}: {factor.score}/{factor.maxScore}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>What Changed / What Needs Attention</CardTitle>
                    <CardDescription>Highest impact signals from the latest 7-day window.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {headlineInsights.length === 0 ? (
                      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
                        <p className="text-sm font-medium text-emerald-900">Store looks stable today.</p>
                        <p className="mt-1 text-sm text-emerald-800">
                          Revenue {formatCurrency(summary.totals.totalRevenue)} across{' '}
                          {summary.totals.totalOrders.toLocaleString()} orders.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {headlineInsights.map((item) => (
                          <article key={item.type} className="rounded-lg border border-border/70 bg-card p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold">{item.title}</p>
                              <span className={severityBadgeClass(item.severity)}>{item.severity}</span>
                            </div>
                            <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                              {item.body}
                            </p>
                          </article>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>
            ) : null}

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard title="Total Revenue" value={formatCurrency(summary.totals.totalRevenue)} />
              <MetricCard title="Total Orders" value={summary.totals.totalOrders.toLocaleString()} />
              <MetricCard title="AOV" value={formatCurrency(summary.totals.averageOrderValue)} />
              <MetricCard title="Units Sold" value={summary.totals.totalUnitsSold.toLocaleString()} />
              <MetricCard
                title="Estimated Profit"
                value={estimatedProfitValue != null ? formatCurrency(estimatedProfitValue) : 'Add profit inputs'}
              />
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Profit Estimator</CardTitle>
                <CardDescription>
                  Optional inputs: COGS per product, processing fees, and shipping. Gross Profit = Revenue - Refunds - COGS - Fees - Shipping.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="space-y-1 text-sm">
                    <span className="text-muted-foreground">Fee %</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={feePercentInput}
                      onChange={(event) => setFeePercentInput(event.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-muted-foreground">Fixed fee per order</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={fixedFeePerOrderInput}
                      onChange={(event) => setFixedFeePerOrderInput(event.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-muted-foreground">Average shipping per order</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={averageShippingPerOrderInput}
                      onChange={(event) => setAverageShippingPerOrderInput(event.target.value)}
                      placeholder="e.g. 4.25"
                      className="h-10 w-full rounded-md border border-input bg-background px-3"
                    />
                  </label>
                </div>

                <div className="overflow-x-auto rounded-md border border-border/70">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border/70 text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Product</th>
                        <th className="px-3 py-2 font-medium">Units Sold</th>
                        <th className="px-3 py-2 font-medium">COGS / Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((product) => {
                        const key = productIdentity(product)
                        return (
                          <tr key={key} className="border-b border-border/60">
                            <td className="px-3 py-2">{product.productName}</td>
                            <td className="px-3 py-2">{product.unitsSold.toLocaleString()}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={productCostInputs[key] ?? ''}
                                onChange={(event) =>
                                  setProductCostInputs((current) => ({
                                    ...current,
                                    [key]: event.target.value,
                                  }))
                                }
                                placeholder="Optional"
                                className="h-9 w-full min-w-32 rounded-md border border-input bg-background px-2"
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {profitEstimate ? (
                  <div className="rounded-md border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
                    <p>
                      Fees: {formatCurrency(profitEstimate.totalFees)} | Shipping: {formatCurrency(profitEstimate.totalShipping)} | COGS: {formatCurrency(profitEstimate.totalCogs)}
                    </p>
                    <p className="mt-1">
                      Estimated margin: {profitEstimate.marginPct != null ? `${(profitEstimate.marginPct * 100).toFixed(1)}%` : 'N/A'}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Skip this section if you only want revenue/order metrics.</p>
                )}
              </CardContent>
            </Card>

            {profitEstimate && profitEstimate.lowMarginProducts.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Low-Margin Products</CardTitle>
                  <CardDescription>Products estimated below 25% margin.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border/70 text-muted-foreground">
                          <th className="py-2 pr-4 font-medium">Product</th>
                          <th className="py-2 pr-4 font-medium">Estimated Profit</th>
                          <th className="py-2 font-medium">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profitEstimate.lowMarginProducts.map((product) => (
                          <tr key={product.key} className="border-b border-border/60">
                            <td className="py-3 pr-4">{product.productName}</td>
                            <td className="py-3 pr-4">{formatCurrency(product.estimatedProfit)}</td>
                            <td className="py-3">{product.marginPct != null ? `${(product.marginPct * 100).toFixed(1)}%` : 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {deadStockItems.length > 0 ? (
              <Card className="border-amber-300 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-amber-900">Dead Stock Alert</CardTitle>
                  <CardDescription className="text-amber-800">Products with zero orders in the last 30 days.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-amber-200 text-amber-900/80">
                          <th className="py-2 pr-4 font-medium">Product</th>
                          <th className="py-2 pr-4 font-medium">Last Order Date</th>
                          <th className="py-2 font-medium">Total Units Sold</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deadStockItems.map((item) => (
                          <tr key={`${item.sku ?? 'nosku'}-${item.productName}`} className="border-b border-amber-200/70">
                            <td className="py-3 pr-4">{item.productName}</td>
                            <td className="py-3 pr-4">{item.lastOrderDate}</td>
                            <td className="py-3">{item.totalUnitsSold.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Last {summary.rangeDays} days</CardDescription>
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
                <CardTitle>Best Day & Time to Run Sales</CardTitle>
                <CardDescription>
                  {summary.salesTiming.bestDay && summary.salesTiming.bestHour
                    ? `Your customers buy most on ${summary.salesTiming.bestDay} around ${summary.salesTiming.bestHour}.`
                    : 'Not enough order timestamps yet.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="h-64">
                    <p className="mb-2 text-sm font-medium text-muted-foreground">Orders by Day of Week</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ordersByDay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-64">
                    <p className="mb-2 text-sm font-medium text-muted-foreground">Orders by Hour</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ordersByHour}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={2} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
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
                        <th className="py-2 pr-4 font-medium">Revenue</th>
                        <th className="py-2 pr-4 font-medium">Estimated Profit</th>
                        <th className="py-2 font-medium">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProductsWithProfit.map((product) => (
                        <tr key={`${product.sku ?? 'nosku'}-${product.productName}`} className="border-b border-border/50">
                          <td className="py-3 pr-4">{product.productName}</td>
                          <td className="py-3 pr-4">{product.unitsSold.toLocaleString()}</td>
                          <td className="py-3 pr-4">{formatCurrency(product.revenue)}</td>
                          <td className="py-3 pr-4">
                            {product.estimatedProfit != null ? formatCurrency(product.estimatedProfit) : 'Enter COGS'}
                          </td>
                          <td className="py-3">
                            {product.marginPct != null ? `${(product.marginPct * 100).toFixed(1)}%` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <ShopifyAiCopilot
              isDemoMode={isDemoMode}
              paywalled={state.paywalled}
              plan={state.plan}
              contextPacket={copilotContext}
            />
          </div>
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

function productIdentity(product: ShopifyTopProduct): string {
  return `${(product.sku ?? '').trim().toLowerCase()}::${product.productName.trim().toLowerCase()}`
}

function parseOptionalNumber(value: string): number | null {
  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return parsed
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

function severityBadgeClass(
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'HIGH' | 'MED'
): string {
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    return 'rounded bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700'
  }

  if (severity === 'WARNING' || severity === 'MED') {
    return 'rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700'
  }

  return 'rounded bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700'
}

function healthLabelClass(label: 'Excellent' | 'Good' | 'Watch' | 'Risk'): string {
  if (label === 'Excellent') {
    return 'text-emerald-700'
  }

  if (label === 'Good') {
    return 'text-blue-700'
  }

  if (label === 'Watch') {
    return 'text-amber-700'
  }

  return 'text-rose-700'
}
