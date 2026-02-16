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

export async function getDashboardSummaryForUser(
  userId: string,
  datasetId?: string
): Promise<DashboardSummaryResponse> {
  await ensureCurrentUser(userId)

  const dataset = await resolveDatasetForSummary(userId, datasetId)
  if (!dataset) {
    return createEmptySummary()
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

  const monthlyMap = new Map<string, { revenue: number; expenses: number }>()
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

    let rowRevenue = 0
    let rowExpense = 0

    if (revenueValue != null || expenseValue != null) {
      rowRevenue = revenueValue != null ? Math.abs(revenueValue) : 0
      rowExpense = expenseValue != null ? Math.abs(expenseValue) : 0
    } else if (amountValue != null) {
      const inferredType = inferAmountType(typeValue, amountValue)
      if (inferredType === 'expense') {
        rowExpense = Math.abs(amountValue)
      } else {
        rowRevenue = Math.abs(amountValue)
      }
    }

    if (rowRevenue > 0 || rowExpense > 0) {
      totalRevenue += rowRevenue
      totalExpenses += rowExpense

      if (dateValue) {
        const monthKey = `${dateValue.getUTCFullYear()}-${String(dateValue.getUTCMonth() + 1).padStart(2, '0')}`
        const monthBucket = monthlyMap.get(monthKey) ?? { revenue: 0, expenses: 0 }
        monthBucket.revenue += rowRevenue
        monthBucket.expenses += rowExpense
        monthlyMap.set(monthKey, monthBucket)
      }

      const productName =
        toText(record[mappings.productColumn ?? '']) ?? toText(record[mappings.customerColumn ?? ''])
      const categoryName = toText(record[mappings.categoryColumn ?? ''])

      if (productName && rowRevenue > 0) {
        productRevenueMap.set(productName, (productRevenueMap.get(productName) ?? 0) + rowRevenue)
      }

      if (categoryName) {
        categoryTotalMap.set(
          categoryName,
          (categoryTotalMap.get(categoryName) ?? 0) + rowRevenue + rowExpense
        )
      }

      if (categoryName && rowExpense > 0) {
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
        category: toText(record[mappings.categoryColumn ?? '']),
        type:
          rowExpense > 0
            ? 'expense'
            : rowRevenue > 0
              ? 'revenue'
              : inferAmountType(typeValue, amountValue ?? 0) ?? 'unknown',
        revenue: round2(rowRevenue),
        expense: round2(rowExpense),
        amount: round2(rowRevenue - rowExpense),
        data: record,
      })
    }
  }

  const monthlySeries = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([monthKey, values]) => ({
      label: formatMonthLabel(monthKey),
      revenue: round2(values.revenue),
      expenses: round2(values.expenses),
      profit: round2(values.revenue - values.expenses),
    }))

  const topItemsSource = productRevenueMap.size > 0 ? productRevenueMap : categoryTotalMap
  const topItems = toBreakdownPoints(topItemsSource, 8)
  const expenseBreakdown = toBreakdownPoints(expenseByCategoryMap, 6)

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
    .slice(0, 10)

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
      monthlySeries: getMonthlyFallback(monthlySeries, mappings),
      topItems: topItems.length > 0 ? null : 'Not enough product/category data for the top-items chart.',
      expenseBreakdown:
        expenseBreakdown.length > 0
          ? null
          : 'Not enough expense category data for the expense breakdown chart.',
    },
  }
}

function createEmptySummary(): DashboardSummaryResponse {
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
      monthlySeries: 'Upload and activate a dataset to view monthly trends.',
      topItems: 'Upload and activate a dataset to view top items.',
      expenseBreakdown: 'Upload and activate a dataset to view expense breakdown.',
    },
  }
}

async function resolveDatasetForSummary(userId: string, datasetId?: string) {
  if (datasetId) {
    return prisma.dataset.findFirst({
      where: { id: datasetId, userId },
    })
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

function formatMonthLabel(monthKey: string): string {
  const [yearText, monthText] = monthKey.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return monthKey
  }

  const date = new Date(Date.UTC(year, month - 1, 1))
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
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

function getMonthlyFallback(
  series: DashboardSeriesPoint[],
  mappings: {
    dateColumn: string | null
    amountColumn: string | null
    revenueColumn: string | null
    expenseColumn: string | null
  }
): string | null {
  if (series.length > 0) return null
  if (!mappings.dateColumn) return 'Not enough date data for monthly trend chart.'
  if (!mappings.amountColumn && !mappings.revenueColumn && !mappings.expenseColumn) {
    return 'Not enough numeric columns (amount/revenue/expense) for monthly trend chart.'
  }
  return 'Not enough data points for monthly trend chart.'
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
