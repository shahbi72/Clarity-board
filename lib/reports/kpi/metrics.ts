import { parseISO, subDays, startOfDay } from 'date-fns'
import type { CleanRow } from '@/lib/reports/cleaning/engine'
import type { KpiInference } from '@/lib/reports/kpi/inference'

export type DateRange = {
  from?: string
  to?: string
}

export type DashboardMetrics = {
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
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

function dateFromRow(row: CleanRow, dateColumn: string | null): Date | null {
  if (!dateColumn) {
    return null
  }

  const value = row[dateColumn]
  if (!value || typeof value !== 'string') {
    return null
  }

  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function withinRange(date: Date | null, range: DateRange): boolean {
  if (!date) {
    return false
  }

  const from = range.from ? parseISO(range.from) : null
  const to = range.to ? parseISO(range.to) : null

  if (from && date < startOfDay(from)) {
    return false
  }

  if (to && date > to) {
    return false
  }

  return true
}

function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null
  }

  return Number((((current - previous) / previous) * 100).toFixed(2))
}

export function computeDashboardMetrics(params: {
  rows: CleanRow[]
  mapping: KpiInference
  range?: DateRange
}): DashboardMetrics {
  const range = params.range ?? {}
  const rowsWithDate = params.rows
    .map((row) => ({ row, date: dateFromRow(row, params.mapping.dateColumn) }))
    .filter((entry) => withinRange(entry.date, range))

  const trendMap = new Map<string, { revenue: number; cost: number; profit: number; orders: number }>()
  let conversionTotal = 0
  let conversionCount = 0

  for (const entry of rowsWithDate) {
    const revenue = params.mapping.revenueColumn ? toNumber(entry.row[params.mapping.revenueColumn]) : 0
    const cost = params.mapping.costColumn ? toNumber(entry.row[params.mapping.costColumn]) : 0
    const orders = params.mapping.ordersColumn ? toNumber(entry.row[params.mapping.ordersColumn]) : 0

    const profit = params.mapping.profitColumn
      ? toNumber(entry.row[params.mapping.profitColumn])
      : revenue - cost

    if (params.mapping.conversionRateColumn) {
      const conversion = toNumber(entry.row[params.mapping.conversionRateColumn])
      if (Number.isFinite(conversion)) {
        conversionTotal += conversion
        conversionCount += 1
      }
    }

    if (entry.date) {
      const key = entry.date.toISOString().slice(0, 10)
      const current = trendMap.get(key) ?? { revenue: 0, cost: 0, profit: 0, orders: 0 }
      trendMap.set(key, {
        revenue: current.revenue + revenue,
        cost: current.cost + cost,
        profit: current.profit + profit,
        orders: current.orders + orders,
      })
    }
  }

  const trend = [...trendMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, values]) => ({
      date,
      revenue: Number(values.revenue.toFixed(2)),
      cost: Number(values.cost.toFixed(2)),
      profit: Number(values.profit.toFixed(2)),
      orders: Number(values.orders.toFixed(2)),
    }))

  const totals = trend.reduce(
    (acc, point) => {
      acc.revenue += point.revenue
      acc.cost += point.cost
      acc.profit += point.profit
      acc.orders += point.orders
      return acc
    },
    { revenue: 0, cost: 0, profit: 0, orders: 0 }
  )

  const now = new Date()
  const currentStart = subDays(now, 7)
  const previousStart = subDays(now, 14)

  const currentWindow = trend.filter((point) => {
    const date = parseISO(point.date)
    return date >= currentStart && date <= now
  })

  const previousWindow = trend.filter((point) => {
    const date = parseISO(point.date)
    return date >= previousStart && date < currentStart
  })

  const sum = (points: typeof trend, key: 'revenue' | 'cost' | 'profit' | 'orders'): number =>
    points.reduce((total, point) => total + point[key], 0)

  return {
    totals: {
      revenue: Number(totals.revenue.toFixed(2)),
      cost: Number(totals.cost.toFixed(2)),
      profit: Number(totals.profit.toFixed(2)),
      orders: Number(totals.orders.toFixed(2)),
      conversionRate: conversionCount > 0 ? Number((conversionTotal / conversionCount).toFixed(4)) : null,
    },
    wowDelta: {
      revenue: percentDelta(sum(currentWindow, 'revenue'), sum(previousWindow, 'revenue')),
      cost: percentDelta(sum(currentWindow, 'cost'), sum(previousWindow, 'cost')),
      profit: percentDelta(sum(currentWindow, 'profit'), sum(previousWindow, 'profit')),
      orders: percentDelta(sum(currentWindow, 'orders'), sum(previousWindow, 'orders')),
    },
    trend,
  }
}

