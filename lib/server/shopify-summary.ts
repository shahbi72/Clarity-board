import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/server/prisma'
import type {
  ShopifyPeriodComparison,
  ShopifySummary,
  ShopifyTopProduct,
  ShopifyTrendPoint,
  ShopifyTrendRangeDays,
} from '@/lib/types/shopify'

type ShopifyCleanRow = {
  orderId: string
  orderName: string
  createdAt: string | null
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

type ProductHistoryAggregate = {
  productName: string
  sku: string | null
  totalUnitsSold: number
  lastOrderAt: Date
  unitsSoldLast30Days: number
}

type ProductRevenueAggregate = {
  productName: string
  sku: string | null
  revenue: number
}

type PeriodAggregate = {
  revenue: number
  orders: number
  unitsSold: number
  refunded: number
  estimatedCost: number
  hasAnyCost: boolean
  products: Map<string, ProductRevenueAggregate>
}

type OrderAggregate = {
  orderId: string
  createdAt: string | null
  createdDate: string
  isCancelled: boolean
  refundedAmountUsd: number
  lines: ShopifyCleanRow[]
}

type UserSummaryResult = {
  datasetName: string | null
  rows: ShopifyCleanRow[]
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

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
    .map((order) => parseDate(order.createdAt ?? order.createdDate))
    .filter((value): value is Date => value != null)

  if (allOrderDates.length === 0) {
    return createEmptySummary(input)
  }

  const sortedDates = allOrderDates.sort((a, b) => a.getTime() - b.getTime())
  const latestDate = sortedDates[sortedDates.length - 1]
  const rangeStart = startOfUtcDay(addUtcDays(latestDate, -(input.rangeDays - 1)))
  const rangeEnd = endOfUtcDay(latestDate)
  const deadStockStart = startOfUtcDay(addUtcDays(latestDate, -29))
  const comparisonWindowDays = 7 as const
  const comparisonCurrentStart = startOfUtcDay(addUtcDays(latestDate, -(comparisonWindowDays - 1)))
  const comparisonCurrentEnd = endOfUtcDay(latestDate)
  const comparisonPreviousStart = startOfUtcDay(addUtcDays(latestDate, -((comparisonWindowDays * 2) - 1)))
  const comparisonPreviousEnd = endOfUtcDay(addUtcDays(latestDate, -comparisonWindowDays))

  let totalRevenue = 0
  let totalOrders = 0
  let totalUnitsSold = 0
  let totalRefunded = 0
  let excludedCancelledOrders = 0
  let hasAnyCost = false
  let totalEstimatedCost = 0

  const trendTotalsByDate = new Map<string, number>()
  const topProductTotals = new Map<string, ProductAggregate>()
  const productHistoryTotals = new Map<string, ProductHistoryAggregate>()
  const dayOfWeekOrders = Array.from({ length: 7 }, () => 0)
  const hourOfDayOrders = Array.from({ length: 24 }, () => 0)
  const currentPeriodTotals = createPeriodAggregate()
  const previousPeriodTotals = createPeriodAggregate()

  for (const order of groupedOrders) {
    const orderDate = parseDate(order.createdAt ?? order.createdDate)
    if (!orderDate) {
      continue
    }

    if (input.includeCancelled || !order.isCancelled) {
      dayOfWeekOrders[orderDate.getUTCDay()] += 1
      hourOfDayOrders[orderDate.getUTCHours()] += 1
    }

    if (!input.includeCancelled && order.isCancelled) {
      excludedCancelledOrders += 1
      continue
    }

    const grossUsd = order.lines.reduce((sum, line) => sum + Math.max(0, line.lineGrossUsd), 0)
    if (grossUsd <= 0) {
      continue
    }

    const refundedUsd = Math.max(0, order.refundedAmountUsd)
    const netRevenueUsd = Math.max(0, grossUsd - refundedUsd)
    const allocationRatio = grossUsd > 0 ? netRevenueUsd / grossUsd : 1

    accumulateProductHistory({
      orderDate,
      deadStockStart,
      order,
      productHistoryTotals,
    })

    const isCurrentComparisonPeriod = isBetweenInclusive(
      orderDate,
      comparisonCurrentStart,
      comparisonCurrentEnd
    )
    const isPreviousComparisonPeriod = isBetweenInclusive(
      orderDate,
      comparisonPreviousStart,
      comparisonPreviousEnd
    )

    if (isCurrentComparisonPeriod) {
      accumulatePeriodAggregate({
        aggregate: currentPeriodTotals,
        order,
        netRevenueUsd,
        refundedUsd,
        allocationRatio,
      })
    } else if (isPreviousComparisonPeriod) {
      accumulatePeriodAggregate({
        aggregate: previousPeriodTotals,
        order,
        netRevenueUsd,
        refundedUsd,
        allocationRatio,
      })
    }

    if (orderDate.getTime() < rangeStart.getTime() || orderDate.getTime() > rangeEnd.getTime()) {
      continue
    }

    totalOrders += 1
    totalRevenue += netRevenueUsd
    totalRefunded += refundedUsd

    const trendKey = toIsoDate(orderDate)
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

  const deadStockItems = Array.from(productHistoryTotals.values())
    .filter((item) => item.totalUnitsSold > 0 && item.unitsSoldLast30Days === 0)
    .sort((a, b) => a.lastOrderAt.getTime() - b.lastOrderAt.getTime())
    .slice(0, 12)
    .map((item) => ({
      productName: item.productName,
      sku: item.sku ?? null,
      lastOrderDate: toIsoDate(item.lastOrderAt),
      totalUnitsSold: Math.round(item.totalUnitsSold),
    }))

  const ordersByDay = DAY_LABELS.map((day, index) => ({
    day,
    orders: dayOfWeekOrders[index],
  }))
  const ordersByHour = hourOfDayOrders.map((orders, hour) => ({
    hour,
    label: formatHourLabel(hour),
    orders,
  }))
  const bestDayIndex = indexOfMax(dayOfWeekOrders)
  const bestHourIndex = indexOfMax(hourOfDayOrders)

  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const estimatedProfit = hasAnyCost ? totalRevenue - totalEstimatedCost : null
  const comparison7d = buildPeriodComparison({
    windowDays: comparisonWindowDays,
    current: currentPeriodTotals,
    previous: previousPeriodTotals,
    currentStart: comparisonCurrentStart,
    currentEnd: comparisonCurrentEnd,
    previousStart: comparisonPreviousStart,
    previousEnd: comparisonPreviousEnd,
  })

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
    comparison7d,
    excludedCancelledOrders,
    deadStock: {
      lookbackDays: 30,
      items: deadStockItems,
    },
    salesTiming: {
      bestDay: bestDayIndex >= 0 && dayOfWeekOrders[bestDayIndex] > 0 ? DAY_LABELS[bestDayIndex] : null,
      bestHour:
        bestHourIndex >= 0 && hourOfDayOrders[bestHourIndex] > 0
          ? formatHourLabel(bestHourIndex)
          : null,
      ordersByDay,
      ordersByHour,
    },
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
    comparison7d: buildEmptyComparison7d(),
    excludedCancelledOrders: 0,
    deadStock: {
      lookbackDays: 30,
      items: [],
    },
    salesTiming: {
      bestDay: null,
      bestHour: null,
      ordersByDay: DAY_LABELS.map((day) => ({ day, orders: 0 })),
      ordersByHour: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        label: formatHourLabel(hour),
        orders: 0,
      })),
    },
  }
}

function createPeriodAggregate(): PeriodAggregate {
  return {
    revenue: 0,
    orders: 0,
    unitsSold: 0,
    refunded: 0,
    estimatedCost: 0,
    hasAnyCost: false,
    products: new Map(),
  }
}

function accumulatePeriodAggregate(params: {
  aggregate: PeriodAggregate
  order: OrderAggregate
  netRevenueUsd: number
  refundedUsd: number
  allocationRatio: number
}) {
  const { aggregate, order, netRevenueUsd, refundedUsd, allocationRatio } = params
  aggregate.orders += 1
  aggregate.revenue += netRevenueUsd
  aggregate.refunded += refundedUsd

  for (const line of order.lines) {
    const quantity = Math.max(0, line.quantity)
    aggregate.unitsSold += quantity

    const lineRevenue = Math.max(0, line.lineGrossUsd) * allocationRatio
    const productKey = line.lineitemSku?.trim().toLowerCase() || line.productName.trim().toLowerCase()
    const existing = aggregate.products.get(productKey)
    const next: ProductRevenueAggregate = existing
      ? {
          ...existing,
          revenue: existing.revenue + lineRevenue,
        }
      : {
          productName: line.productName,
          sku: line.lineitemSku,
          revenue: lineRevenue,
        }
    aggregate.products.set(productKey, next)

    if (line.estimatedLineCostUsd != null) {
      aggregate.hasAnyCost = true
      aggregate.estimatedCost += Math.max(0, line.estimatedLineCostUsd) * allocationRatio
    }
  }
}

function accumulateProductHistory(params: {
  orderDate: Date
  deadStockStart: Date
  order: OrderAggregate
  productHistoryTotals: Map<string, ProductHistoryAggregate>
}) {
  const { orderDate, deadStockStart, order, productHistoryTotals } = params

  for (const line of order.lines) {
    const productKey = line.lineitemSku?.trim().toLowerCase() || line.productName.trim().toLowerCase()
    const quantity = Math.max(0, line.quantity)
    const existingHistory = productHistoryTotals.get(productKey)
    const historyRecord: ProductHistoryAggregate = existingHistory
      ? {
          ...existingHistory,
          totalUnitsSold: existingHistory.totalUnitsSold + quantity,
          lastOrderAt:
            orderDate.getTime() > existingHistory.lastOrderAt.getTime()
              ? orderDate
              : existingHistory.lastOrderAt,
          unitsSoldLast30Days:
            existingHistory.unitsSoldLast30Days +
            (orderDate.getTime() >= deadStockStart.getTime() ? quantity : 0),
        }
      : {
          productName: line.productName,
          sku: line.lineitemSku,
          totalUnitsSold: quantity,
          lastOrderAt: orderDate,
          unitsSoldLast30Days: orderDate.getTime() >= deadStockStart.getTime() ? quantity : 0,
        }

    productHistoryTotals.set(productKey, historyRecord)
  }
}

function buildPeriodComparison(params: {
  windowDays: 7
  current: PeriodAggregate
  previous: PeriodAggregate
  currentStart: Date
  currentEnd: Date
  previousStart: Date
  previousEnd: Date
}): ShopifyPeriodComparison {
  const currentAov = params.current.orders > 0 ? params.current.revenue / params.current.orders : 0
  const previousAov = params.previous.orders > 0 ? params.previous.revenue / params.previous.orders : 0
  const currentRefundRate = params.current.revenue > 0 ? params.current.refunded / params.current.revenue : 0
  const previousRefundRate =
    params.previous.revenue > 0 ? params.previous.refunded / params.previous.revenue : 0
  const currentMargin = computeMarginPct(params.current)
  const previousMargin = computeMarginPct(params.previous)

  const previousTopSku = Array.from(params.previous.products.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
  const totalRevenueDelta = params.current.revenue - params.previous.revenue

  const topSkuDeclines = previousTopSku
    .map((item) => {
      const key = item.sku?.trim().toLowerCase() || item.productName.trim().toLowerCase()
      const currentRevenue = params.current.products.get(key)?.revenue ?? 0
      const deltaPct = percentDelta(currentRevenue, item.revenue)
      const deltaValue = currentRevenue - item.revenue
      const contributionShare =
        totalRevenueDelta !== 0 ? Math.abs(deltaValue) / Math.abs(totalRevenueDelta) : null

      return {
        productName: item.productName,
        sku: item.sku ?? null,
        previousRevenue: round2(item.revenue),
        currentRevenue: round2(currentRevenue),
        deltaValue: round2(deltaValue),
        contributionShare: contributionShare != null ? round4(contributionShare) : null,
        deltaPct,
      }
    })
    .filter((item) => item.deltaPct <= -0.2)
    .sort((a, b) => a.deltaPct - b.deltaPct)

  return {
    windowDays: params.windowDays,
    current: {
      from: toIsoDate(params.currentStart),
      to: toIsoDate(params.currentEnd),
      revenue: round2(params.current.revenue),
      orders: params.current.orders,
      unitsSold: Math.round(params.current.unitsSold),
      refunded: round2(params.current.refunded),
      averageOrderValue: round2(currentAov),
      refundRate: round4(currentRefundRate),
      marginPct: currentMargin,
    },
    previous: {
      from: toIsoDate(params.previousStart),
      to: toIsoDate(params.previousEnd),
      revenue: round2(params.previous.revenue),
      orders: params.previous.orders,
      unitsSold: Math.round(params.previous.unitsSold),
      refunded: round2(params.previous.refunded),
      averageOrderValue: round2(previousAov),
      refundRate: round4(previousRefundRate),
      marginPct: previousMargin,
    },
    deltas: {
      revenuePct: round4(percentDelta(params.current.revenue, params.previous.revenue)),
      ordersPct: round4(percentDelta(params.current.orders, params.previous.orders)),
      averageOrderValuePct: round4(percentDelta(currentAov, previousAov)),
      refundRateDelta: round4(currentRefundRate - previousRefundRate),
      refundRateRelative: previousRefundRate > 0 ? round4((currentRefundRate - previousRefundRate) / previousRefundRate) : null,
      marginDelta:
        currentMargin != null && previousMargin != null ? round4(currentMargin - previousMargin) : null,
    },
    topSkuDeclines: topSkuDeclines.map((item) => ({
      ...item,
      deltaPct: round4(item.deltaPct),
    })),
  }
}

function buildEmptyComparison7d(): ShopifyPeriodComparison {
  const today = startOfUtcDay(new Date())
  const currentFrom = startOfUtcDay(addUtcDays(today, -6))
  const previousFrom = startOfUtcDay(addUtcDays(today, -13))
  const previousTo = endOfUtcDay(addUtcDays(today, -7))
  const currentTo = endOfUtcDay(today)

  return {
    windowDays: 7,
    current: {
      from: toIsoDate(currentFrom),
      to: toIsoDate(currentTo),
      revenue: 0,
      orders: 0,
      unitsSold: 0,
      refunded: 0,
      averageOrderValue: 0,
      refundRate: 0,
      marginPct: null,
    },
    previous: {
      from: toIsoDate(previousFrom),
      to: toIsoDate(previousTo),
      revenue: 0,
      orders: 0,
      unitsSold: 0,
      refunded: 0,
      averageOrderValue: 0,
      refundRate: 0,
      marginPct: null,
    },
    deltas: {
      revenuePct: 0,
      ordersPct: 0,
      averageOrderValuePct: 0,
      refundRateDelta: 0,
      refundRateRelative: null,
      marginDelta: null,
    },
    topSkuDeclines: [],
  }
}

function computeMarginPct(value: PeriodAggregate): number | null {
  if (!value.hasAnyCost || value.revenue <= 0) {
    return null
  }

  return round4((value.revenue - value.estimatedCost) / value.revenue)
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
  const createdAt = toText(row.createdAt)
  const createdDate = toText(row.createdDate)
  const productName = toText(row.productName)

  if (!orderId || !orderName || !createdDate || !productName) {
    return null
  }

  return {
    orderId,
    orderName,
    createdAt,
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
        createdAt: row.createdAt,
        createdDate: row.createdDate,
        isCancelled: row.isCancelled,
        refundedAmountUsd: Math.max(0, row.refundedAmountUsd),
        lines: [row],
      })
      continue
    }

    existing.lines.push(row)
    existing.createdAt = existing.createdAt ?? row.createdAt
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

function indexOfMax(values: number[]): number {
  if (values.length === 0) {
    return -1
  }

  let maxIndex = 0
  let maxValue = values[0]

  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > maxValue) {
      maxValue = values[index]
      maxIndex = index
    }
  }

  return maxIndex
}

function formatHourLabel(hour: number): string {
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  const meridiem = hour >= 12 ? 'PM' : 'AM'
  return `${hour12}${meridiem}`
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000
}

function percentDelta(current: number, previous: number): number {
  if (previous === 0) {
    if (current === 0) {
      return 0
    }
    return current > 0 ? 1 : -1
  }

  return (current - previous) / Math.abs(previous)
}

function isBetweenInclusive(value: Date, from: Date, to: Date): boolean {
  const time = value.getTime()
  return time >= from.getTime() && time <= to.getTime()
}
