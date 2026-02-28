'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { ShopifySummary, ShopifySummaryApiResponse, ShopifyTrendRangeDays } from '@/lib/types/shopify'

type ViewState = {
  loading: boolean
  error: string | null
  paywalled: boolean
  summary: ShopifySummary | null
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
        throw new Error(payload.error || 'Unable to load dashboard.')
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

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

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
        <Button
          type="button"
          variant={rangeDays === 7 ? 'default' : 'outline'}
          onClick={() => setRangeDays(7)}
        >
          Last 7 days
        </Button>
        <Button
          type="button"
          variant={rangeDays === 30 ? 'default' : 'outline'}
          onClick={() => setRangeDays(30)}
        >
          Last 30 days
        </Button>
        <Button
          type="button"
          variant={includeCancelled ? 'default' : 'outline'}
          onClick={() => setIncludeCancelled((value) => !value)}
        >
          {includeCancelled ? 'Including cancelled orders' : 'Exclude cancelled orders'}
        </Button>
        {!isDemoMode ? (
          <Button type="button" variant="outline" asChild>
            <Link href="/upload">Upload new CSV</Link>
          </Button>
        ) : null}
      </section>

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
              <Link href="/pricing">View plan ($25/month)</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!state.loading && !state.paywalled && state.summary && !state.summary.hasData ? (
        <Card>
          <CardHeader>
            <CardTitle>No Shopify data yet</CardTitle>
            <CardDescription>
              Upload a Shopify Orders CSV to see your revenue, orders, AOV, and top products.
            </CardDescription>
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
              <CardDescription>
                Last {state.summary.rangeDays} days
                {state.summary.excludedCancelledOrders > 0 && !state.summary.includeCancelled
                  ? ` • ${state.summary.excludedCancelledOrders} cancelled orders excluded`
                  : ''}
              </CardDescription>
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
              <CardDescription>Merged by SKU when available.</CardDescription>
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
                        <td className="py-3 pr-4">
                          <div className="font-medium">{product.productName}</div>
                          {product.sku ? (
                            <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
                          ) : null}
                        </td>
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
