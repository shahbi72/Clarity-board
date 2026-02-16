import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/server/prisma'
import { ensureCurrentUser } from '@/lib/server/auth'
import { getActiveDatasetForUser } from '@/lib/server/datasets'
import type {
  ActiveDatasetMetadata,
  DataRow,
  SuggestionsCategoryPoint,
  SuggestionsMissingField,
  SuggestionsResponse,
  SuggestionsTrendPoint,
} from '@/lib/types/data-pipeline'

const DATE_COLUMN_ALIASES = ['date', 'created_at', 'transaction_date', 'createdat', 'transactiondate']
const NUMERIC_COLUMN_PREFERENCES = [
  'amount',
  'total',
  'revenue',
  'profit',
  'expense',
  'value',
  'sales',
  'income',
  'cost',
  'spending',
]
const CATEGORY_COLUMN_ALIASES = ['category', 'product', 'customer', 'expense_category']

export async function getSuggestionsForUser(userId: string): Promise<SuggestionsResponse> {
  await ensureCurrentUser(userId)
  const dataset = await getActiveDatasetForUser(userId)

  if (!dataset) {
    return emptySuggestionsResponse()
  }

  const rows = await prisma.datasetRow.findMany({
    where: { datasetId: dataset.id },
    orderBy: { rowIndex: 'asc' },
    select: { data: true },
  })

  const dataRows = rows.map((row) => asDataRow(row.data)).filter(Boolean) as DataRow[]
  return buildSuggestionsFromRows(dataset, dataRows)
}

function buildSuggestionsFromRows(
  dataset: ActiveDatasetMetadata,
  rows: DataRow[]
): SuggestionsResponse {
  const columns = dataset.columns
  const dateColumn = findColumn(columns, DATE_COLUMN_ALIASES)
  const categoryColumn = findColumn(columns, CATEGORY_COLUMN_ALIASES)
  const numericColumns = detectNumericColumns(columns, rows)
  const primaryMetricColumn =
    choosePrimaryMetricColumn(columns, numericColumns) ?? numericColumns[0] ?? null

  const metricsValues = primaryMetricColumn
    ? rows
        .map((row) => parseNumericValue(row[primaryMetricColumn]))
        .filter((value): value is number => value != null)
    : []

  const total = sum(metricsValues)
  const average = metricsValues.length > 0 ? total / metricsValues.length : 0
  const min = metricsValues.length > 0 ? Math.min(...metricsValues) : null
  const max = metricsValues.length > 0 ? Math.max(...metricsValues) : null

  const missingFields = calculateMissingFields(columns, rows)
  const duplicateCount = calculateDuplicateCount(rows)
  const invalidDates = calculateInvalidDateCount(rows, dateColumn)
  const outlierCount = calculateOutlierCount(metricsValues)

  const timeseries = buildMonthlyTimeseries(rows, dateColumn, primaryMetricColumn)
  const momGrowthPct = calculateMomGrowth(timeseries)
  const topCategories = buildTopCategories(rows, categoryColumn, primaryMetricColumn)

  const summaryBullets = buildSummaryBullets({
    dataset,
    primaryMetricColumn,
    metricsValues,
    total,
    average,
    topCategories,
    momGrowthPct,
  })

  const recommendations = buildRecommendations({
    dateColumn,
    categoryColumn,
    primaryMetricColumn,
    missingFields,
    duplicateCount,
    invalidDates,
    outlierCount,
    momGrowthPct,
    topCategories,
  })

  return {
    dataset,
    mappings: {
      dateColumn,
      primaryMetricColumn,
      categoryColumn,
      numericColumns,
    },
    summary: { bullets: summaryBullets },
    quality: {
      missingFields: missingFields.slice(0, 6),
      duplicateCount,
      invalidDates,
      outlierCount,
    },
    metrics: {
      total: round2(total),
      average: round2(average),
      min: min != null ? round2(min) : null,
      max: max != null ? round2(max) : null,
      sampleSize: metricsValues.length,
    },
    trends: {
      timeseries,
      momGrowthPct,
    },
    topCategories,
    recommendations,
  }
}

function emptySuggestionsResponse(): SuggestionsResponse {
  return {
    dataset: null,
    mappings: {
      dateColumn: null,
      primaryMetricColumn: null,
      categoryColumn: null,
      numericColumns: [],
    },
    summary: { bullets: [] },
    quality: {
      missingFields: [],
      duplicateCount: 0,
      invalidDates: 0,
      outlierCount: 0,
    },
    metrics: {
      total: 0,
      average: 0,
      min: null,
      max: null,
      sampleSize: 0,
    },
    trends: {
      timeseries: [],
      momGrowthPct: null,
    },
    topCategories: [],
    recommendations: [],
  }
}

function buildSummaryBullets(context: {
  dataset: ActiveDatasetMetadata
  primaryMetricColumn: string | null
  metricsValues: number[]
  total: number
  average: number
  topCategories: SuggestionsCategoryPoint[]
  momGrowthPct: number | null
}): string[] {
  const bullets: string[] = []

  bullets.push(
    `${context.dataset.name} has ${context.dataset.rowCount.toLocaleString()} rows across ${context.dataset.columns.length} columns.`
  )

  if (context.primaryMetricColumn && context.metricsValues.length > 0) {
    bullets.push(
      `Primary metric "${context.primaryMetricColumn}" totals ${formatCurrency(context.total)} with an average of ${formatCurrency(context.average)}.`
    )
  } else {
    bullets.push('No reliable numeric metric column detected for financial aggregation.')
  }

  if (context.topCategories.length > 0) {
    const top = context.topCategories[0]
    bullets.push(`Top segment: ${top.name} contributes ${formatCurrency(top.value)}.`)
  } else {
    bullets.push('No category/product/customer column detected for segment comparison.')
  }

  if (context.momGrowthPct != null) {
    const direction = context.momGrowthPct >= 0 ? 'up' : 'down'
    bullets.push(
      `Latest month-over-month trend is ${direction} ${Math.abs(context.momGrowthPct).toFixed(1)}%.`
    )
  }

  return bullets
}

function buildRecommendations(context: {
  dateColumn: string | null
  categoryColumn: string | null
  primaryMetricColumn: string | null
  missingFields: SuggestionsMissingField[]
  duplicateCount: number
  invalidDates: number
  outlierCount: number
  momGrowthPct: number | null
  topCategories: SuggestionsCategoryPoint[]
}): string[] {
  const recommendations: string[] = []

  const highMissingField = context.missingFields.find((field) => field.missingRate >= 0.2)
  if (highMissingField) {
    recommendations.push(
      `Clean "${highMissingField.column}" first: ${highMissingField.missingCount.toLocaleString()} missing values (${(highMissingField.missingRate * 100).toFixed(1)}%).`
    )
  }

  if (context.duplicateCount > 0) {
    recommendations.push(
      `Remove ${context.duplicateCount.toLocaleString()} duplicate rows to avoid biased aggregates.`
    )
  }

  if (context.invalidDates > 0) {
    recommendations.push(
      `Normalize ${context.invalidDates.toLocaleString()} invalid date values in "${context.dateColumn ?? 'date'}" to improve trend accuracy.`
    )
  }

  if (context.outlierCount > 0) {
    recommendations.push(
      `Review ${context.outlierCount.toLocaleString()} outlier points in "${context.primaryMetricColumn ?? 'numeric metric'}" before forecasting.`
    )
  }

  if (context.momGrowthPct != null && context.momGrowthPct < -10) {
    recommendations.push(
      `Investigate drivers behind the ${Math.abs(context.momGrowthPct).toFixed(1)}% month-over-month decline and set a recovery target.`
    )
  }

  if (context.categoryColumn && context.topCategories.length > 0) {
    const top = context.topCategories[0]
    recommendations.push(
      `Double down on ${top.name}; replicate its patterns across lower-performing ${context.categoryColumn} segments.`
    )
  }

  if (!context.primaryMetricColumn) {
    recommendations.push(
      'Include a standardized numeric metric column (for example: amount, total, revenue) to unlock stronger recommendations.'
    )
  }

  if (!context.dateColumn) {
    recommendations.push(
      'Add a clean date column (for example: date, created_at, transaction_date) for trend and seasonality insights.'
    )
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue monitoring monthly changes and set alert thresholds for abnormal spikes.')
    recommendations.push('Track data quality checks weekly so trends remain decision-ready.')
  }

  return recommendations.slice(0, 6)
}

function calculateMissingFields(columns: string[], rows: DataRow[]): SuggestionsMissingField[] {
  if (rows.length === 0) return []

  return columns
    .map((column) => {
      let missingCount = 0
      for (const row of rows) {
        const value = row[column]
        if (value == null || (typeof value === 'string' && value.trim() === '')) {
          missingCount += 1
        }
      }
      return {
        column,
        missingCount,
        missingRate: missingCount / rows.length,
      }
    })
    .sort((a, b) => b.missingRate - a.missingRate)
}

function calculateDuplicateCount(rows: DataRow[]): number {
  const seen = new Set<string>()
  let duplicates = 0

  for (const row of rows) {
    const signature = stableRowSignature(row)
    if (seen.has(signature)) {
      duplicates += 1
    } else {
      seen.add(signature)
    }
  }

  return duplicates
}

function stableRowSignature(row: DataRow): string {
  const entries = Object.entries(row).sort(([a], [b]) => a.localeCompare(b))
  return JSON.stringify(entries)
}

function calculateInvalidDateCount(rows: DataRow[], dateColumn: string | null): number {
  if (!dateColumn) return 0

  let count = 0
  for (const row of rows) {
    const value = row[dateColumn]
    if (value == null || String(value).trim() === '') continue
    if (!parseDateValue(value)) {
      count += 1
    }
  }

  return count
}

function calculateOutlierCount(values: number[]): number {
  if (values.length < 8) return 0

  const mean = sum(values) / values.length
  const variance = values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / values.length
  const std = Math.sqrt(variance)
  if (!Number.isFinite(std) || std === 0) return 0

  return values.filter((value) => Math.abs((value - mean) / std) >= 3).length
}

function buildMonthlyTimeseries(
  rows: DataRow[],
  dateColumn: string | null,
  metricColumn: string | null
): SuggestionsTrendPoint[] {
  if (!dateColumn || !metricColumn) return []

  const buckets = new Map<string, number>()
  for (const row of rows) {
    const date = parseDateValue(row[dateColumn])
    const value = parseNumericValue(row[metricColumn])
    if (!date || value == null) continue

    const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    buckets.set(monthKey, (buckets.get(monthKey) ?? 0) + value)
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([monthKey, value]) => ({
      date: formatMonthLabel(monthKey),
      value: round2(value),
    }))
}

function calculateMomGrowth(timeseries: SuggestionsTrendPoint[]): number | null {
  if (timeseries.length < 2) return null

  const previous = timeseries[timeseries.length - 2].value
  const current = timeseries[timeseries.length - 1].value
  if (previous === 0) return null

  return round2(((current - previous) / Math.abs(previous)) * 100)
}

function buildTopCategories(
  rows: DataRow[],
  categoryColumn: string | null,
  metricColumn: string | null
): SuggestionsCategoryPoint[] {
  if (!categoryColumn || !metricColumn) return []

  const totals = new Map<string, number>()
  for (const row of rows) {
    const category = toText(row[categoryColumn])
    const value = parseNumericValue(row[metricColumn])
    if (!category || value == null) continue
    totals.set(category, (totals.get(category) ?? 0) + Math.abs(value))
  }

  return Array.from(totals.entries())
    .map(([name, value]) => ({ name, value: round2(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
}

function choosePrimaryMetricColumn(columns: string[], numericColumns: string[]): string | null {
  const normalized = new Map(columns.map((column) => [normalizeColumnKey(column), column]))

  for (const preferred of NUMERIC_COLUMN_PREFERENCES) {
    const exact = normalized.get(normalizeColumnKey(preferred))
    if (exact && numericColumns.includes(exact)) {
      return exact
    }
  }

  for (const preferred of NUMERIC_COLUMN_PREFERENCES) {
    const match = numericColumns.find((column) =>
      normalizeColumnKey(column).includes(normalizeColumnKey(preferred))
    )
    if (match) return match
  }

  return numericColumns[0] ?? null
}

function detectNumericColumns(columns: string[], rows: DataRow[]): string[] {
  const results: string[] = []

  for (const column of columns) {
    let nonEmptyCount = 0
    let numericCount = 0

    for (const row of rows) {
      const value = row[column]
      if (value == null || (typeof value === 'string' && value.trim() === '')) {
        continue
      }

      nonEmptyCount += 1
      if (parseNumericValue(value) != null) {
        numericCount += 1
      }
    }

    if (nonEmptyCount === 0) continue
    const ratio = numericCount / nonEmptyCount
    if (numericCount >= 3 && ratio >= 0.6) {
      results.push(column)
    }
  }

  return results
}

function findColumn(columns: string[], aliases: string[]): string | null {
  const normalizedAliases = aliases.map((alias) => normalizeColumnKey(alias))
  const exact = new Map(columns.map((column) => [normalizeColumnKey(column), column]))

  for (const alias of normalizedAliases) {
    const match = exact.get(alias)
    if (match) return match
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

function toText(value: unknown): string | null {
  if (value == null) return null
  const text = String(value).trim()
  return text || null
}

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
