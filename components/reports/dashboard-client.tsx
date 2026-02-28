'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type SummaryResponse = {
  data: {
    paywalled: boolean
    gate: {
      allowed: boolean
      reason: string
      trialEndsAt: string | null
    }
    dataset?: {
      id: string
      name: string
      rowCount: number
      updatedAt: string
    } | null
    metrics?: {
      totals: {
        revenue: number
        cost: number
        profit: number
        orders: number
        conversionRate: number | null
      }
      wowDelta: {
        revenue: number | null
        cost: number | null
        profit: number | null
        orders: number | null
      }
      trend: Array<{
        date: string
        revenue: number
        cost: number
        profit: number
        orders: number
      }>
    } | null
  }
}

function metricCard(label: string, value: string, delta: number | null) {
  const deltaLabel = delta === null ? 'n/a' : `${delta > 0 ? '+' : ''}${delta.toFixed(2)}% WoW`
  const deltaClass = delta === null ? 'text-slate-400' : delta >= 0 ? 'text-emerald-400' : 'text-rose-400'

  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className={`mt-2 text-xs ${deltaClass}`}>{deltaLabel}</p>
    </article>
  )
}

export function ReportsDashboardClient() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<SummaryResponse['data'] | null>(null)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    return params.toString()
  }, [from, to])

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const url = query ? `/api/reports/dashboard/summary?${query}` : '/api/reports/dashboard/summary'
      const res = await fetch(url, { cache: 'no-store' })
      const json = (await res.json()) as SummaryResponse

      if (!res.ok) {
        setError(json?.data ? 'Failed to load dashboard' : 'Failed to load dashboard')
      } else {
        setResponse(json.data)
      }
    } catch {
      setError('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    void fetchSummary()
  }, [fetchSummary])

  if (loading) {
    return <p className="text-sm text-slate-300">Loading dashboard...</p>
  }

  if (error) {
    return <p className="rounded border border-rose-500/40 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>
  }

  if (!response) {
    return <p className="text-sm text-slate-300">No data.</p>
  }

  if (response.paywalled) {
    return (
      <section className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-5">
        <h2 className="text-lg font-semibold">Subscription required</h2>
        <p className="mt-2 text-sm text-amber-100">
          Your 7-day trial ended or subscription is inactive. Reactivate billing to access dashboards.
        </p>
        <Link href="/reports/billing" className="mt-4 inline-block rounded bg-amber-400 px-4 py-2 text-sm text-slate-950">
          Open Billing
        </Link>
      </section>
    )
  }

  if (!response.dataset || !response.metrics) {
    return (
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-semibold">No synced dataset yet</h2>
        <p className="mt-2 text-sm text-slate-300">Connect a Google Sheet to generate KPI dashboards.</p>
        <Link href="/reports/connect" className="mt-4 inline-block rounded bg-cyan-400 px-4 py-2 text-sm text-slate-950">
          Connect a Sheet
        </Link>
      </section>
    )
  }

  const metrics = response.metrics

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <button
            onClick={() => void fetchSummary()}
            className="rounded bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950"
          >
            Apply Filters
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">Dataset: {response.dataset.name}</p>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {metricCard('Revenue', metrics.totals.revenue.toFixed(2), metrics.wowDelta.revenue)}
        {metricCard('Cost', metrics.totals.cost.toFixed(2), metrics.wowDelta.cost)}
        {metricCard('Profit', metrics.totals.profit.toFixed(2), metrics.wowDelta.profit)}
        {metricCard('Orders', metrics.totals.orders.toFixed(2), metrics.wowDelta.orders)}
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-lg font-semibold">Trend</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Revenue</th>
                <th className="pb-2 pr-4">Cost</th>
                <th className="pb-2 pr-4">Profit</th>
                <th className="pb-2 pr-4">Orders</th>
              </tr>
            </thead>
            <tbody>
              {metrics.trend.map((point) => (
                <tr key={point.date} className="border-t border-slate-800">
                  <td className="py-2 pr-4">{point.date}</td>
                  <td className="py-2 pr-4">{point.revenue.toFixed(2)}</td>
                  <td className="py-2 pr-4">{point.cost.toFixed(2)}</td>
                  <td className="py-2 pr-4">{point.profit.toFixed(2)}</td>
                  <td className="py-2 pr-4">{point.orders.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

