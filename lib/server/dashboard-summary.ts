import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/server/prisma'
import { ensureCurrentUser } from '@/lib/server/auth'
import type {
  DashboardBreakdownPoint,
  DashboardRecentTransaction,
  DashboardSeriesPoint,
  DashboardSummaryResponse,
  DataRow,
  DatasetListItem,
} from '@/lib/types/data-pipeline'

const AMOUNT_TYPE_KEYWORDS = {
  expense: ['expense', 'cost', 'spend', 'spending', 'debit', 'outflow', 'withdrawal', 'payment'],
  revenue: ['revenue', 'income', 'sale', 'sales', 'credit', 'deposit'],
}

const RECENT_TRANSACTIONS_LIMIT = 120

const COLUMN_ALIASES = {
  date: ['date', 'created_at', 'transaction_date', 'createdat', 'transactiondate'],
  amount: ['amount', 'total', 'value'],
  type: ['type', 'kind', 'transaction_type', 'transactiontype'],
  category: ['category', 'expense_category', 'expensecategory'],
  revenue: ['revenue', 'sales', 'income'],
  expense: ['expense', 'cost', 'spending'],
  product: ['product', 'product_name', 'productname', 'item', 'name'],
  customer: ['customer', 'customer_name', 'customername', 'client'],
}

type DashboardDateRange = {
  from: Date | null
  to: Date | null
}

type TrendGranularity = 'day' | 'week' | 'month'

type TrendPointInput = {
  date: Date
  revenue: number
  expenses: number
}

export async function getDashboardSummaryForUser(
  userId: string,
  preferredActiveDatasetId: string | null = null,
  preferredDateRange: DashboardDateRange = { from: null, to: null }
): Promise<DashboardSummaryResponse> {
  await ensureCurrentUser(userId)

  const dataset = await resolveActiveDatasetForSummary(userId, preferredActiveDatasetId)
  if (!dataset) {
    return createEmptyDashboardSummary()
  }

  const rows = await prisma.datasetRow.findMany({
    where: { datasetId: dataset.id },
    orderBy: { rowIndex: 'asc' },
    select: { rowIndex: true, data: true },
  })

  const columns = asStringArray(dataset.columns)
  const mappings = mapColumns(columns)

  let totalRevenue = 0
  let totalExpenses = 0

  const trendPoints: TrendPointInput[] = []
  const productRevenueMap = new Map<string, number>()
  const categoryTotalMap = new Map<string, number>()
  const expenseByCategoryMap = new Map<string, number>()
  const recentTransactions: DashboardRecentTransaction[] = []

  for (const row of rows) {
    const record = asDataRow(row.data)
    if (!record) continue

    const dateValue = parseDateValue(record[mappings.dateColumn ?? ''])
    const dateLabel = dateValue ? toIsoDate(dateValue) : null

    const revenueValue = parseNumericValue(record[mappings.revenueColumn ?? ''])
    const expenseValue = parseNumericValue(record[mappings.expenseColumn ?? ''])
    const amountValue = parseNumericValue(record[mappings.amountColumn ?? ''])
    const typeValue = toLowerText(record[mappings.typeColumn ?? ''])

    let effectiveAmount: number | null = null
    if (amountValue != null) {
      effectiveAmount = amountValue
    } else if (revenueValue != null || expenseValue != null) {
      const normalizedRevenue = revenueValue != null ? Math.abs(revenueValue) : 0
      const normalizedExpense = expenseValue != null ? Math.abs(expenseValue) : 0
      effectiveAmount = normalizedRevenue - normalizedExpense
    }

    const rowRevenue = effectiveAmount != null && effectiveAmount > 0 ? effectiveAmount : 0
    const rowExpense = effectiveAmount != null && effectiveAmount < 0 ? Math.abs(effectiveAmount) : 0

    if (rowRevenue > 0 || rowExpense > 0) {
      totalRevenue += rowRevenue
      totalExpenses += rowExpense

      if (dateValue) {
        trendPoints.push({
          date: dateValue,
          revenue: rowRevenue,
          expenses: rowExpense,
        })
      }

      const productName =
        toText(record[mappings.productColumn ?? '']) ?? toText(record[mappings.customerColumn ?? ''])
      const categoryName = normalizeCategory(record[mappings.categoryColumn ?? ''])

      if (productName && rowRevenue > 0) {
        productRevenueMap.set(productName, (productRevenueMap.get(productName) ?? 0) + rowRevenue)
      }

      categoryTotalMap.set(
        categoryName,
        (categoryTotalMap.get(categoryName) ?? 0) + rowRevenue + rowExpense
      )

      if (rowExpense > 0) {
        expenseByCategoryMap.set(
          categoryName,
          (expenseByCategoryMap.get(categoryName) ?? 0) + rowExpense
        )
      }
    }

    const description =
      toText(record[mappings.productColumn ?? '']) ??
      toText(record[mappings.customerColumn ?? '']) ??
      toText(record[mappings.categoryColumn ?? '']) ??
      null

    const hasTransactionSignal =
      rowRevenue > 0 ||
      rowExpense > 0 ||
      amountValue != null ||
      description != null ||
      dateLabel != null

    if (hasTransactionSignal) {
      recentTransactions.push({
        rowIndex: row.rowIndex,
        date: dateLabel,
        description,
        category: normalizeCategory(record[mappings.categoryColumn ?? '']),
        type:
          rowExpense > 0
            ? 'expense'
            : rowRevenue > 0
              ? 'revenue'
              : inferAmountType(typeValue, effectiveAmount ?? amountValue ?? 0) ?? 'unknown',
        revenue: round2(rowRevenue),
        expense: round2(rowExpense),
        amount: round2(effectiveAmount ?? rowRevenue - rowExpense),
        data: record,
      })
    }
  }

  const monthlySeries =
    mappings.dateColumn != null
      ? buildContinuousTrendSeries(trendPoints, preferredDateRange)
      : []

  const topItemsSource = productRevenueMap.size > 0 ? productRevenueMap : categoryTotalMap
  const topItems = toBreakdownPoints(topItemsSource, 8)
  const expenseBreakdown = toTopCategoriesWithOther(expenseByCategoryMap, 6)

  const sortedRecent = recentTransactions
    .sort((a, b) => {
      const aTime = a.date ? Date.parse(a.date) : NaN
      const bTime = b.date ? Date.parse(b.date) : NaN
      const aHasDate = Number.isFinite(aTime)
      const bHasDate = Number.isFinite(bTime)
      if (aHasDate && bHasDate) {
        return bTime - aTime
      }
      if (aHasDate) return -1
      if (bHasDate) return 1
      return b.rowIndex - a.rowIndex
    })
    .slice(0, RECENT_TRANSACTIONS_LIMIT)

  const previewRows = rows
    .slice(0, 10)
    .map((row) => asDataRow(row.data))
    .filter(Boolean) as DataRow[]

  const datasetListItem: DatasetListItem = {
    id: dataset.id,
    name: dataset.name,
    fileType: dataset.fileType,
    sizeBytes: dataset.sizeBytes,
    rowCount: dataset.rowCount,
    columns,
    createdAt: dataset.createdAt.toISOString(),
    updatedAt: dataset.updatedAt.toISOString(),
    isActive: true,
  }

  return {
    dataset: datasetListItem,
    mappings,
    metrics: {
      rowCount: dataset.rowCount,
      columnCount: columns.length,
      totalRevenue: round2(totalRevenue),
      totalExpenses: round2(totalExpenses),
      netProfit: round2(totalRevenue - totalExpenses),
      cashIn: round2(totalRevenue),
      cashOut: round2(totalExpenses),
    },
    charts: {
      monthlySeries,
      topItems,
      expenseBreakdown,
    },
    previewRows,
    recentTransactions: sortedRecent,
    fallback: {
      monthlySeries: getTrendFallback(monthlySeries, mappings),
      topItems: topItems.length > 0 ? null : 'Not enough product/category data for the top-items chart.',
      expenseBreakdown:
        expenseBreakdown.length > 0
          ? null
          : 'Not enough expense category data for the expense breakdown chart.',
    },
  }
}

export function createEmptyDashboardSummary(): DashboardSummaryResponse {
  return {
    dataset: null,
    mappings: {
      dateColumn: null,
      amountColumn: null,
      typeColumn: null,
      categoryColumn: null,
      revenueColumn: null,
      expenseColumn: null,
      productColumn: null,
      customerColumn: null,
    },
    metrics: {
      rowCount: 0,
      columnCount: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      cashIn: 0,
      cashOut: 0,
    },
    charts: {
      monthlySeries: [],
      topItems: [],
      expenseBreakdown: [],
    },
    previewRows: [],
    recentTransactions: [],
    fallback: {
      monthlySeries: 'Upload and activate a dataset to view trend data.',
      topItems: 'Upload and activate a dataset to view top items.',
      expenseBreakdown: 'Upload and activate a dataset to view expense breakdown.',
    },
  }
}

async function resolveActiveDatasetForSummary(
  userId: string,
  preferredActiveDatasetId: string | null
) {
  const normalizedPreferredDatasetId = preferredActiveDatasetId?.trim() || null

  if (normalizedPreferredDatasetId) {
    const preferredDataset = await prisma.dataset.findFirst({
      where: { id: normalizedPreferredDatasetId, userId },
    })

    if (preferredDataset) {
      await prisma.user.updateMany({
        where: {
          id: userId,
          NOT: {
            activeDatasetId: normalizedPreferredDatasetId,
          },
        },
        data: { activeDatasetId: normalizedPreferredDatasetId },
      })

      return preferredDataset
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeDatasetId: true },
  })

  if (!user?.activeDatasetId) {
    return null
  }

  const activeDataset = await prisma.dataset.findFirst({
    where: { id: user.activeDatasetId, userId },
  })
  if (activeDataset) {
    return activeDataset
  }

  await prisma.user.update({
    where: { id: userId },
    data: { activeDatasetId: null },
  })

  return null
}

function mapColumns(columns: string[]) {
  return {
    dateColumn: findColumn(columns, COLUMN_ALIASES.date),
    amountColumn: findColumn(columns, COLUMN_ALIASES.amount),
    typeColumn: findColumn(columns, COLUMN_ALIASES.type),
    categoryColumn: findColumn(columns, COLUMN_ALIASES.category),
    revenueColumn: findColumn(columns, COLUMN_ALIASES.revenue),
    expenseColumn: findColumn(columns, COLUMN_ALIASES.expense),
    productColumn: findColumn(columns, COLUMN_ALIASES.product),
    customerColumn: findColumn(columns, COLUMN_ALIASES.customer),
  }
}

function findColumn(columns: string[], aliases: string[]): string | null {
  const normalizedAliases = aliases.map((alias) => normalizeColumnKey(alias))
  const exactMap = new Map(columns.map((column) => [normalizeColumnKey(column), column]))

  for (const alias of normalizedAliases) {
    const exactMatch = exactMap.get(alias)
    if (exactMatch) return exactMatch
  }

  for (const column of columns) {
    const normalized = normalizeColumnKey(column)
    if (normalizedAliases.some((alias) => normalized.includes(alias) || alias.includes(normalized))) {
      return column
    }
  }

  return null
}

function normalizeColumnKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function asStringArray(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return []
  return value.map((column) => String(column))
}

function asDataRow(value: Prisma.JsonValue): DataRow | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const row: DataRow = {}
  for (const [key, cell] of Object.entries(value as Record<string, unknown>)) {
    if (
      typeof cell === 'string' ||
      typeof cell === 'number' ||
      typeof cell === 'boolean' ||
      cell === null
    ) {
      row[key] = cell
      continue
    }
    row[key] = cell == null ? null : String(cell)
  }
  return row
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value !== 'string') return null

  const text = value.trim()
  if (!text) return null

  const hasParentheses = /^\((.+)\)$/.test(text)
  let normalized = text.replace(/[()]/g, '')
  normalized = normalized.replace(/[\u2212\u2013\u2014]/g, '-')
  normalized = normalized.replace(/[$,]/g, '')
  normalized = normalized.replace(/\s+/g, '')

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null

  return hasParentheses ? -Math.abs(parsed) : parsed
}

function parseDateValue(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const asDate = new Date(value)
    return Number.isNaN(asDate.getTime()) ? null : asDate
  }

  if (typeof value !== 'string') return null

  const text = value.trim()
  if (!text) return null

  const timestamp = Date.parse(text)
  if (Number.isNaN(timestamp)) return null

  return new Date(timestamp)
}

function toIsoDate(value: Date): string {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
    .toISOString()
    .slice(0, 10)
}

function normalizeCategory(value: unknown): string {
  return toText(value) ?? 'Uncategorized'
}

function buildContinuousTrendSeries(
  points: TrendPointInput[],
  preferredDateRange: DashboardDateRange
): DashboardSeriesPoint[] {
  const resolvedRange = resolveTrendRange(points, preferredDateRange)
  if (!resolvedRange) return []

  const granularity = chooseTrendGranularity(resolvedRange.from, resolvedRange.to)
  const totalsByBucket = new Map<string, { revenue: number; expenses: number }>()

  for (const point of points) {
    const timestamp = point.date.getTime()
    if (timestamp < resolvedRange.from.getTime() || timestamp > resolvedRange.to.getTime()) {
      continue
    }

    const bucketStart = getBucketStart(point.date, granularity)
    const bucketKey = toIsoDate(bucketStart)
    const bucket = totalsByBucket.get(bucketKey) ?? { revenue: 0, expenses: 0 }
    bucket.revenue += point.revenue
    bucket.expenses += point.expenses
    totalsByBucket.set(bucketKey, bucket)
  }

  const bucketStarts = buildContinuousBucketStarts(
    resolvedRange.from,
    resolvedRange.to,
    granularity
  )

  return bucketStarts.map((bucketStart) => {
    const bucketKey = toIsoDate(bucketStart)
    const totals = totalsByBucket.get(bucketKey) ?? { revenue: 0, expenses: 0 }
    const revenue = round2(totals.revenue)
    const expenses = round2(totals.expenses)

    return {
      label: formatTrendLabel(bucketStart, granularity),
      revenue,
      expenses,
      profit: round2(revenue - expenses),
    }
  })
}

function resolveTrendRange(
  points: TrendPointInput[],
  preferredDateRange: DashboardDateRange
): { from: Date; to: Date } | null {
  const normalizedRange = normalizeDateRange(preferredDateRange)
  const hasExplicitFrom = normalizedRange.from != null
  const hasExplicitTo = normalizedRange.to != null
  const earliestPoint = points.reduce<Date | null>(
    (current, point) =>
      current == null || point.date.getTime() < current.getTime() ? point.date : current,
    null
  )
  const latestPoint = points.reduce<Date | null>(
    (current, point) =>
      current == null || point.date.getTime() > current.getTime() ? point.date : current,
    null
  )

  const from =
    normalizedRange.from != null
      ? startOfUtcDay(normalizedRange.from)
      : earliestPoint != null
        ? startOfUtcDay(earliestPoint)
        : null
  const to =
    normalizedRange.to != null
      ? endOfUtcDay(normalizedRange.to)
      : latestPoint != null
        ? endOfUtcDay(latestPoint)
        : from != null
          ? endOfUtcDay(from)
          : null

  if (!from || !to) return null
  if (from.getTime() > to.getTime()) {
    if (hasExplicitFrom && !hasExplicitTo) {
      return {
        from: startOfUtcDay(normalizedRange.from as Date),
        to: endOfUtcDay(normalizedRange.from as Date),
      }
    }

    if (!hasExplicitFrom && hasExplicitTo) {
      return {
        from: startOfUtcDay(normalizedRange.to as Date),
        to: endOfUtcDay(normalizedRange.to as Date),
      }
    }

    return {
      from: startOfUtcDay(to),
      to: endOfUtcDay(from),
    }
  }

  return { from, to }
}

function normalizeDateRange(range: DashboardDateRange): DashboardDateRange {
  if (!range.from || !range.to) {
    return range
  }

  if (range.from.getTime() <= range.to.getTime()) {
    return range
  }

  return {
    from: range.to,
    to: range.from,
  }
}

function chooseTrendGranularity(from: Date, to: Date): TrendGranularity {
  const dayMs = 24 * 60 * 60 * 1000
  const fromStart = startOfUtcDay(from).getTime()
  const toStart = startOfUtcDay(to).getTime()
  const daySpan = Math.floor((toStart - fromStart) / dayMs) + 1

  if (daySpan <= 45) return 'day'
  if (daySpan <= 180) return 'week'
  return 'month'
}

function buildContinuousBucketStarts(from: Date, to: Date, granularity: TrendGranularity): Date[] {
  const bucketStarts: Date[] = []
  let cursor = getBucketStart(from, granularity)
  const endBucketStart = getBucketStart(to, granularity)

  while (cursor.getTime() <= endBucketStart.getTime()) {
    bucketStarts.push(cursor)
    cursor = addBucket(cursor, granularity, 1)
  }

  return bucketStarts
}

function getBucketStart(date: Date, granularity: TrendGranularity): Date {
  if (granularity === 'day') return startOfUtcDay(date)
  if (granularity === 'week') return startOfUtcWeek(date)
  return startOfUtcMonth(date)
}

function addBucket(date: Date, granularity: TrendGranularity, amount: number): Date {
  if (granularity === 'day') return addUtcDays(date, amount)
  if (granularity === 'week') return addUtcDays(date, amount * 7)

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1))
}

function formatTrendLabel(bucketStart: Date, granularity: TrendGranularity): string {
  if (granularity === 'day') {
    return bucketStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (granularity === 'week') {
    const weekEnd = addUtcDays(bucketStart, 6)
    const startLabel = bucketStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endLabel = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${startLabel} - ${endLabel}`
  }

  return bucketStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function endOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)
  )
}

function startOfUtcWeek(date: Date): Date {
  const dayStart = startOfUtcDay(date)
  const weekday = dayStart.getUTCDay()
  const offset = weekday === 0 ? -6 : 1 - weekday
  return addUtcDays(dayStart, offset)
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function addUtcDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime())
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

function inferAmountType(
  typeValue: string | null,
  amountValue: number
): 'revenue' | 'expense' | null {
  if (typeValue) {
    const normalized = typeValue.toLowerCase()
    if (AMOUNT_TYPE_KEYWORDS.expense.some((keyword) => normalized.includes(keyword))) {
      return 'expense'
    }
    if (AMOUNT_TYPE_KEYWORDS.revenue.some((keyword) => normalized.includes(keyword))) {
      return 'revenue'
    }
  }

  if (amountValue < 0) return 'expense'
  if (amountValue > 0) return 'revenue'
  return null
}

function toText(value: unknown): string | null {
  if (value == null) return null
  const text = String(value).trim()
  return text ? text : null
}

function toLowerText(value: unknown): string | null {
  const text = toText(value)
  return text ? text.toLowerCase() : null
}

function toBreakdownPoints(source: Map<string, number>, take: number): DashboardBreakdownPoint[] {
  return Array.from(source.entries())
    .map(([name, value]) => ({ name, value: round2(value) }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, take)
}

function toTopCategoriesWithOther(
  source: Map<string, number>,
  topCount: number
): DashboardBreakdownPoint[] {
  const sorted = Array.from(source.entries())
    .map(([name, value]) => ({ name, value: round2(value) }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)

  if (sorted.length <= topCount) {
    return sorted
  }

  const topCategories = sorted.slice(0, topCount)
  const otherTotal = round2(sorted.slice(topCount).reduce((sum, item) => sum + item.value, 0))

  if (otherTotal > 0) {
    topCategories.push({
      name: 'Other',
      value: otherTotal,
    })
  }

  return topCategories
}

function getTrendFallback(
  series: DashboardSeriesPoint[],
  mappings: {
    dateColumn: string | null
    amountColumn: string | null
    revenueColumn: string | null
    expenseColumn: string | null
  }
): string | null {
  if (series.length > 0) return null
  if (!mappings.dateColumn) return 'Not enough date data for trend chart.'
  if (!mappings.amountColumn && !mappings.revenueColumn && !mappings.expenseColumn) {
    return 'Not enough numeric columns (amount/revenue/expense) for trend chart.'
  }
  return 'Not enough data points for trend chart.'
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
