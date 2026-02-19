'use client'

import { useEffect, useMemo, useState } from 'react'

import { ChartCard } from '@/components/dashboard/ChartCard'
import { KpiRow, type KpiItem } from '@/components/dashboard/KpiRow'
import { Sidebar } from '@/components/dashboard/Sidebar'
import {
  TopFilters,
  type DateRangeOption,
  type ProductOption,
  type RegionOption,
} from '@/components/dashboard/TopFilters'
import { HeatmapTable } from '@/components/dashboard/charts/HeatmapTable'
import { RevenueLine } from '@/components/dashboard/charts/RevenueLine'
import { SalesBar } from '@/components/dashboard/charts/SalesBar'
import { SegmentDonut } from '@/components/dashboard/charts/SegmentDonut'

const MONEY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const NUMBER = new Intl.NumberFormat('en-US')

const MONTHLY_BASE = [
  { period: 'Jan', revenue: 312000, orders: 1240 },
  { period: 'Feb', revenue: 328000, orders: 1325 },
  { period: 'Mar', revenue: 341000, orders: 1390 },
  { period: 'Apr', revenue: 356000, orders: 1442 },
  { period: 'May', revenue: 372000, orders: 1508 },
  { period: 'Jun', revenue: 384000, orders: 1576 },
  { period: 'Jul', revenue: 401000, orders: 1622 },
  { period: 'Aug', revenue: 418000, orders: 1680 },
  { period: 'Sep', revenue: 434000, orders: 1743 },
  { period: 'Oct', revenue: 452000, orders: 1795 },
  { period: 'Nov', revenue: 471000, orders: 1868 },
  { period: 'Dec', revenue: 489000, orders: 1936 },
]

const CHANNEL_BASE = [
  { channel: 'Direct', sales: 4820, goal: 4500 },
  { channel: 'Partner', sales: 3950, goal: 3800 },
  { channel: 'Marketplace', sales: 3280, goal: 3100 },
  { channel: 'Inside Sales', sales: 2740, goal: 2600 },
  { channel: 'Field', sales: 2410, goal: 2300 },
]

const SEGMENT_BASE = [
  { name: 'Enterprise', value: 420, color: '#0ea5e9' },
  { name: 'Mid-Market', value: 320, color: '#1d4ed8' },
  { name: 'SMB', value: 210, color: '#22c55e' },
  { name: 'Public Sector', value: 150, color: '#f59e0b' },
]

const HEATMAP_BASE = [
  { category: 'Platform', newBiz: 82, expansion: 72, renewal: 91, upsell: 68 },
  { category: 'Services', newBiz: 74, expansion: 80, renewal: 86, upsell: 70 },
  { category: 'Security', newBiz: 88, expansion: 77, renewal: 94, upsell: 72 },
  { category: 'Data', newBiz: 79, expansion: 84, renewal: 90, upsell: 75 },
  { category: 'Automation', newBiz: 85, expansion: 73, renewal: 88, upsell: 81 },
]

const REGION_FACTOR: Record<RegionOption, number> = {
  all: 1,
  na: 1.08,
  eu: 0.95,
  apac: 1.12,
}

const PRODUCT_FACTOR: Record<ProductOption, number> = {
  all: 1,
  clarity: 1.05,
  insights: 1.1,
  ops: 0.97,
}

const RANGE_POINTS: Record<DateRangeOption, number> = {
  '30d': 4,
  '90d': 6,
  '12m': 12,
}

const RANGE_FACTOR: Record<DateRangeOption, number> = {
  '30d': 0.34,
  '90d': 0.62,
  '12m': 1,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getSearchFactor(term: string) {
  if (!term.trim()) return 1
  const normalizedLength = term.trim().length % 7
  return 0.92 + normalizedLength * 0.03
}

export default function DashboardShell() {
  const [dateRange, setDateRange] = useState<DateRangeOption>('90d')
  const [region, setRegion] = useState<RegionOption>('all')
  const [product, setProduct] = useState<ProductOption>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loadingCharts, setLoadingCharts] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoadingCharts(false)
    }, 700)
    return () => window.clearTimeout(timer)
  }, [dateRange, region, product, searchTerm])

  function handleDateRangeChange(value: DateRangeOption) {
    setLoadingCharts(true)
    setDateRange(value)
  }

  function handleRegionChange(value: RegionOption) {
    setLoadingCharts(true)
    setRegion(value)
  }

  function handleProductChange(value: ProductOption) {
    setLoadingCharts(true)
    setProduct(value)
  }

  function handleSearchTermChange(value: string) {
    setLoadingCharts(true)
    setSearchTerm(value)
  }

  const scale = useMemo(() => {
    return REGION_FACTOR[region] * PRODUCT_FACTOR[product] * getSearchFactor(searchTerm)
  }, [product, region, searchTerm])

  const revenueSeries = useMemo(() => {
    const points = RANGE_POINTS[dateRange]
    return MONTHLY_BASE.slice(-points).map((item, index) => {
      const seasonal = 1 + Math.sin(index * 0.6) * 0.045
      const revenue = Math.round(item.revenue * scale * seasonal)
      const orders = Math.round(item.orders * scale * (0.9 + index * 0.02))
      return {
        period: item.period,
        revenue,
        target: Math.round(revenue * 1.08),
        orders,
      }
    })
  }, [dateRange, scale])

  const kpis = useMemo<KpiItem[]>(() => {
    const totalRevenue = revenueSeries.reduce((sum, point) => sum + point.revenue, 0)
    const totalOrders = revenueSeries.reduce((sum, point) => sum + point.orders, 0)
    const avgOrderValue = totalRevenue / Math.max(totalOrders, 1)
    const churn =
      4.4 +
      (region === 'eu' ? 0.35 : 0) +
      (region === 'apac' ? -0.25 : 0) +
      (product === 'insights' ? 0.2 : 0) +
      (product === 'clarity' ? -0.15 : 0) +
      (searchTerm.trim() ? 0.1 : 0)

    return [
      { label: 'Total Revenue', value: MONEY.format(totalRevenue), delta: '+12.4%', trend: 'up' },
      { label: 'Total Orders', value: NUMBER.format(totalOrders), delta: '+8.1%', trend: 'up' },
      { label: 'Avg Order Value', value: MONEY.format(avgOrderValue), delta: '+3.9%', trend: 'up' },
      { label: 'Churn', value: `${clamp(churn, 1.6, 8).toFixed(1)}%`, delta: '-0.6 pp', trend: 'down' },
    ]
  }, [product, region, revenueSeries, searchTerm])

  const barSeries = useMemo(() => {
    const timeScale = RANGE_FACTOR[dateRange]
    return CHANNEL_BASE.map((item, index) => {
      const trend = 1 + Math.cos(index * 0.8) * 0.04
      const sales = Math.round(item.sales * scale * timeScale * trend)
      const goal = Math.round(item.goal * scale * timeScale)
      return {
        channel: item.channel,
        sales,
        goal,
      }
    })
  }, [dateRange, scale])

  const donutSeries = useMemo(() => {
    const timeScale = RANGE_FACTOR[dateRange]
    return SEGMENT_BASE.map((item) => {
      const tilt =
        (item.name === 'Enterprise' && region === 'na' ? 1.08 : 1) *
        (item.name === 'SMB' && product === 'clarity' ? 1.09 : 1) *
        (item.name === 'Mid-Market' && product === 'insights' ? 1.06 : 1)
      return {
        ...item,
        value: Math.round(item.value * scale * timeScale * tilt),
      }
    })
  }, [dateRange, product, region, scale])

  const heatmapData = useMemo(() => {
    const adjustment = (scale - 1) * 16 + (RANGE_FACTOR[dateRange] - 0.6) * 6
    return HEATMAP_BASE.map((row) => ({
      category: row.category,
      newBiz: clamp(Math.round(row.newBiz + adjustment), 40, 99),
      expansion: clamp(Math.round(row.expansion + adjustment * 0.9), 40, 99),
      renewal: clamp(Math.round(row.renewal + adjustment * 0.7), 40, 99),
      upsell: clamp(Math.round(row.upsell + adjustment * 1.05), 40, 99),
    }))
  }, [dateRange, scale])

  const miniStats = useMemo(() => {
    const totalRevenue = revenueSeries.reduce((sum, point) => sum + point.revenue, 0)
    const pipeline = totalRevenue * 0.42
    const winRate = clamp(31 + (scale - 1) * 18, 18, 58)
    const activeAgents = Math.round(58 + scale * 16 + RANGE_FACTOR[dateRange] * 20)

    return [
      {
        title: 'Pipeline Coverage',
        value: MONEY.format(pipeline),
        hint: 'Expected close in next 2 quarters',
      },
      {
        title: 'Win Rate',
        value: `${winRate.toFixed(1)}%`,
        hint: 'Trailing 90-day conversion',
      },
      {
        title: 'Active Agents',
        value: NUMBER.format(activeAgents),
        hint: 'Sales + support automation agents',
      },
    ]
  }, [dateRange, revenueSeries, scale])

  function handleExport() {
    const exportPayload = {
      filters: { dateRange, region, product, searchTerm },
      generatedAt: new Date().toISOString(),
      revenueSeries,
      barSeries,
      donutSeries,
      heatmapData,
    }

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = 'dashboard-export.json'
    link.click()
    URL.revokeObjectURL(objectUrl)
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_minmax(0,1fr)]">
        <Sidebar />

        <main className="space-y-6 p-4 sm:p-6 xl:col-span-2 xl:p-8">
          <TopFilters
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            region={region}
            onRegionChange={handleRegionChange}
            product={product}
            onProductChange={handleProductChange}
            searchTerm={searchTerm}
            onSearchTermChange={handleSearchTermChange}
            onExport={handleExport}
          />

          <KpiRow items={kpis} />

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <ChartCard
              className="lg:col-span-8"
              title="Revenue Trend"
              subtitle="Revenue vs. target by period"
              loading={loadingCharts}
              chartHeightClassName="h-[320px]"
            >
              <RevenueLine data={revenueSeries} />
            </ChartCard>

            <ChartCard
              className="lg:col-span-4"
              title="Customer Segment Mix"
              subtitle="Revenue contribution by segment"
              loading={loadingCharts}
              chartHeightClassName="h-[320px]"
            >
              <SegmentDonut data={donutSeries} />
            </ChartCard>

            <ChartCard
              className="lg:col-span-6"
              title="Sales by Channel"
              subtitle="Actual vs. target performance"
              loading={loadingCharts}
              chartHeightClassName="h-[290px]"
            >
              <SalesBar data={barSeries} />
            </ChartCard>

            <ChartCard
              className="lg:col-span-6"
              title="Profitability Heatmap"
              subtitle="Segment score by product category"
              loading={loadingCharts}
              chartHeightClassName="h-[290px]"
            >
              <HeatmapTable data={heatmapData} />
            </ChartCard>
          </section>

          <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {miniStats.map((card) => (
              <article
                key={card.title}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
                <p className="mt-1 text-sm text-slate-500">{card.hint}</p>
              </article>
            ))}
          </section>
        </main>
      </div>
    </div>
  )
}
