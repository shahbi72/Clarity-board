import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/server/prisma'
import type {
  ShopifySummary,
  ShopifyTopProduct,
  ShopifyTrendPoint,
  ShopifyTrendRangeDays,
} from '@/lib/types/shopify'

type ShopifyCleanRow = {
  orderId: string
  orderName: string
  createdDate: string
  lineitemSku: string | null
  productName: string
  quantity: number
  lineGrossUsd: number
  refundedAmountUsd: number
  estimatedLineCostUsd: number | null
  isCancelled: boolean
}

type SummaryBuildInput = {
  rows: ShopifyCleanRow[]
  datasetName: string | null
  rangeDays: ShopifyTrendRangeDays
  includeCancelled: boolean
  source: 'user' | 'demo'
}

type ProductAggregate = {
  productName: string
  sku: string | null
  unitsSold: number
  revenue: number
}

type OrderAggregate = {
  orderId: string
  createdDate: string
  isCancelled: boolean
  refundedAmountUsd: number
  lines: ShopifyCleanRow[]
}

type UserSummaryResult = {
  datasetName: string | null
  rows: ShopifyCleanRow[]
}

export async function getShopifySummaryForUser(params: {
  userId: string
  rangeDays: ShopifyTrendRangeDays
  includeCancelled: boolean
}): Promise<ShopifySummary> {
  const source = await loadShopifyRowsForUser(params.userId)

  return buildShopifySummary({
    rows: source.rows,
    datasetName: source.datasetName,
    rangeDays: params.rangeDays,
    includeCancelled: params.includeCancelled,
    source: 'user',
  })
}

export function buildShopifySummary(input: SummaryBuildInput): ShopifySummary {
  if (input.rows.length === 0) {
    return createEmptySummary(input)
  }

  const groupedOrders = groupOrders(input.rows)
  const allOrderDates = groupedOrders
    .map((order) => parseDate(order.createdDate))
    .filter((value): value is Date => value != null)

  if (allOrderDates.length === 0) {
    return createEmptySummary(input)
  }

  const sortedDates = allOrderDates.sort((a, b) => a.getTime() - b.getTime())
  const latestDate = sortedDates[sortedDates.length - 1]
  const rangeStart = startOfUtcDay(addUtcDays(latestDate, -(input.rangeDays - 1)))
  const rangeEnd = endOfUtcDay(latestDate)

  let totalRevenue = 0
  let totalOrders = 0
  let totalUnitsSold = 0
  let totalRefunded = 0
  let excludedCancelledOrders = 0
  let hasAnyCost = false
  let totalEstimatedCost = 0

  const trendTotalsByDate = new Map<string, number>()
  const topProductTotals = new Map<string, ProductAggregate>()

  for (const order of groupedOrders) {
    const orderDate = parseDate(order.createdDate)
    if (!orderDate) {
      continue
    }

    if (!input.includeCancelled && order.isCancelled) {
      excludedCancelledOrders += 1
      continue
    }

    if (orderDate.getTime() < rangeStart.getTime() || orderDate.getTime() > rangeEnd.getTime()) {
      continue
    }

    const grossUsd = order.lines.reduce((sum, line) => sum + Math.max(0, line.lineGrossUsd), 0)
    if (grossUsd <= 0) {
      continue
    }

    const refundedUsd = Math.max(0, order.refundedAmountUsd)
    const netRevenueUsd = Math.max(0, grossUsd - refundedUsd)
    const allocationRatio = grossUsd > 0 ? netRevenueUsd / grossUsd : 1

    totalOrders += 1
    totalRevenue += netRevenueUsd
    totalRefunded += refundedUsd

    const trendKey = order.createdDate
    trendTotalsByDate.set(trendKey, (trendTotalsByDate.get(trendKey) ?? 0) + netRevenueUsd)

    for (const line of order.lines) {
      totalUnitsSold += Math.max(0, line.quantity)

      const lineRevenue = Math.max(0, line.lineGrossUsd) * allocationRatio
      const productKey = line.lineitemSku?.trim().toLowerCase() || line.productName.trim().toLowerCase()
      const existing = topProductTotals.get(productKey)
      const next: ProductAggregate = existing
        ? {
            productName: existing.productName,
            sku: existing.sku ?? line.lineitemSku,
            unitsSold: existing.unitsSold + Math.max(0, line.quantity),
            revenue: existing.revenue + lineRevenue,
          }
        : {
            productName: line.productName,
            sku: line.lineitemSku,
            unitsSold: Math.max(0, line.quantity),
            revenue: lineRevenue,
          }
      topProductTotals.set(productKey, next)

      if (line.estimatedLineCostUsd != null) {
        hasAnyCost = true
        totalEstimatedCost += Math.max(0, line.estimatedLineCostUsd) * allocationRatio
      }
    }
  }

  const trend = buildTrendSeries({
    start: rangeStart,
    end: rangeEnd,
    totalsByDate: trendTotalsByDate,
  })

  const topProducts: ShopifyTopProduct[] = Array.from(topProductTotals.values())
    .map((item) => ({
      productName: item.productName,
      sku: item.sku ?? null,
      unitsSold: Math.round(item.unitsSold),
      revenue: round2(item.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const estimatedProfit = hasAnyCost ? totalRevenue - totalEstimatedCost : null

  return {
    source: input.source,
    datasetName: input.datasetName,
    rangeDays: input.rangeDays,
    includeCancelled: input.includeCancelled,
    hasData: totalOrders > 0,
    currency: 'USD',
    totals: {
      totalRevenue: round2(totalRevenue),
      totalOrders,
      averageOrderValue: round2(averageOrderValue),
      totalUnitsSold,
      totalRefunded: round2(totalRefunded),
      estimatedProfit: estimatedProfit != null ? round2(estimatedProfit) : null,
    },
    trend,
    topProducts,
    excludedCancelledOrders,
  }
}

function createEmptySummary(input: SummaryBuildInput): ShopifySummary {
  return {
    source: input.source,
    datasetName: input.datasetName,
    rangeDays: input.rangeDays,
    includeCancelled: input.includeCancelled,
    hasData: false,
    currency: 'USD',
    totals: {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      totalUnitsSold: 0,
      totalRefunded: 0,
      estimatedProfit: null,
    },
    trend: buildEmptyTrend(input.rangeDays),
    topProducts: [],
    excludedCancelledOrders: 0,
  }
}

async function loadShopifyRowsForUser(userId: string): Promise<UserSummaryResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeDatasetId: true },
  })

  const activeDataset =
    (user?.activeDatasetId
      ? await prisma.dataset.findFirst({
          where: {
            id: user.activeDatasetId,
            userId,
          },
          select: { id: true, name: true },
        })
      : null) ??
    (await prisma.dataset.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true },
    }))

  if (!activeDataset) {
    return { datasetName: null, rows: [] }
  }

  const datasetRows = await prisma.datasetRow.findMany({
    where: { datasetId: activeDataset.id },
    orderBy: { rowIndex: 'asc' },
    select: { data: true },
  })

  const cleaned = datasetRows
    .map((row) => asShopifyCleanRow(row.data))
    .filter((row): row is ShopifyCleanRow => row != null)

  return {
    datasetName: activeDataset.name,
    rows: cleaned,
  }
}

function asShopifyCleanRow(value: Prisma.JsonValue): ShopifyCleanRow | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const row = value as Record<string, unknown>
  const orderId = toText(row.orderId)
  const orderName = toText(row.orderName)
  const createdDate = toText(row.createdDate)
  const productName = toText(row.productName)

  if (!orderId || !orderName || !createdDate || !productName) {
    return null
  }

  return {
    orderId,
    orderName,
    createdDate,
    lineitemSku: toText(row.lineitemSku),
    productName,
    quantity: toNumber(row.quantity) ?? 0,
    lineGrossUsd: toNumber(row.lineGrossUsd) ?? 0,
    refundedAmountUsd: toNumber(row.refundedAmountUsd) ?? 0,
    estimatedLineCostUsd: toNumber(row.estimatedLineCostUsd),
    isCancelled: toBoolean(row.isCancelled),
  }
}

function groupOrders(rows: ShopifyCleanRow[]): OrderAggregate[] {
  const byOrderId = new Map<string, OrderAggregate>()

  for (const row of rows) {
    const existing = byOrderId.get(row.orderId)
    if (!existing) {
      byOrderId.set(row.orderId, {
        orderId: row.orderId,
        createdDate: row.createdDate,
        isCancelled: row.isCancelled,
        refundedAmountUsd: Math.max(0, row.refundedAmountUsd),
        lines: [row],
      })
      continue
    }

    existing.lines.push(row)
    existing.refundedAmountUsd = Math.max(existing.refundedAmountUsd, Math.max(0, row.refundedAmountUsd))
    existing.isCancelled = existing.isCancelled || row.isCancelled
  }

  return Array.from(byOrderId.values())
}

function buildEmptyTrend(rangeDays: ShopifyTrendRangeDays): ShopifyTrendPoint[] {
  const today = startOfUtcDay(new Date())
  const from = addUtcDays(today, -(rangeDays - 1))
  return buildTrendSeries({
    start: from,
    end: endOfUtcDay(today),
    totalsByDate: new Map(),
  })
}

function buildTrendSeries(params: {
  start: Date
  end: Date
  totalsByDate: Map<string, number>
}): ShopifyTrendPoint[] {
  const points: ShopifyTrendPoint[] = []
  let cursor = startOfUtcDay(params.start)
  const end = endOfUtcDay(params.end)

  while (cursor.getTime() <= end.getTime()) {
    const key = toIsoDate(cursor)
    points.push({
      date: key,
      revenue: round2(params.totalsByDate.get(key) ?? 0),
    })
    cursor = addUtcDays(cursor, 1)
  }

  return points
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function parseDate(value: string | null): Date | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function addUtcDays(value: Date, days: number): Date {
  const copy = new Date(value.getTime())
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

function endOfUtcDay(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999)
  )
}

function toText(value: unknown): string | null {
  if (value == null) {
    return null
  }

  const text = String(value).trim()
  return text.length > 0 ? text : null
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    return value.trim().toLowerCase() === 'true'
  }

  return false
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
