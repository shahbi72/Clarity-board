import { createHash } from 'crypto'
import Papa from 'papaparse'
import { HttpError } from '@/lib/server/http-error'
import type { DataRow } from '@/lib/types/data-pipeline'

export const MAX_UPLOAD_FILE_SIZE_BYTES = 25 * 1024 * 1024
const MAX_ROWS = 100_000
const SUPPORTED_EXTENSIONS = new Set(['csv'])

const REQUIRED_COLUMN_ALIASES = {
  orderName: ['name', 'order name'],
  createdAt: ['created at', 'createdat'],
  lineitemQuantity: ['lineitem quantity', 'line item quantity', 'lineitemquantity'],
  lineitemName: ['lineitem name', 'line item name', 'lineitemname'],
  lineitemPrice: ['lineitem price', 'line item price', 'lineitemprice'],
} as const

const OPTIONAL_COLUMN_ALIASES = {
  orderId: ['id', 'order id'],
  currency: ['currency'],
  cancelledAt: ['cancelled at', 'canceled at'],
  refundedAmount: ['refunded amount', 'refund amount'],
  financialStatus: ['financial status', 'payment status'],
  lineitemSku: ['lineitem sku', 'line item sku', 'sku'],
  lineitemVariant: ['lineitem variant', 'line item variant', 'variant title'],
  lineitemDiscount: ['lineitem discount', 'line item discount', 'discount amount'],
  orderTotal: ['total', 'order total'],
  costPerItem: ['cost per item', 'lineitem cost', 'line item cost', 'cogs'],
} as const

const CURRENCY_TO_USD: Record<string, number> = {
  USD: 1,
  CAD: 0.74,
  EUR: 1.08,
  GBP: 1.27,
  AUD: 0.65,
  NZD: 0.61,
  JPY: 0.0067,
  TRY: 0.031,
}

type ParsedCsvRow = Record<string, string>

type ParsedColumns = {
  [K in keyof typeof REQUIRED_COLUMN_ALIASES]: string
}

type OptionalParsedColumns = {
  [K in keyof typeof OPTIONAL_COLUMN_ALIASES]: string | null
}

export type ParsedDatasetUpload = {
  columns: string[]
  rows: DataRow[]
  previewRows: DataRow[]
  rowCount: number
  fileType: string
}

export async function parseUploadedDatasetFile(file: File): Promise<ParsedDatasetUpload> {
  validateUploadedFile(file)
  const text = await file.text()
  return parseShopifyOrdersCsvText(text, file.name)
}

export function parseShopifyOrdersCsvText(
  csvText: string,
  fileName = 'shopify-orders.csv'
): ParsedDatasetUpload {
  if (!csvText || !csvText.trim()) {
    throw new HttpError(400, `The uploaded file "${fileName}" is empty.`)
  }

  const parsed = Papa.parse<ParsedCsvRow>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  })

  if (parsed.errors.length > 0 && (!parsed.data || parsed.data.length === 0)) {
    throw new HttpError(
      400,
      'Invalid Shopify Orders CSV. The file could not be parsed.'
    )
  }

  const headers = (parsed.meta.fields ?? []).map((header) => header.trim()).filter(Boolean)
  if (headers.length === 0) {
    throw new HttpError(400, 'Invalid Shopify Orders CSV. Header row is missing.')
  }

  const headerLookup = buildHeaderLookup(headers)
  const requiredColumns = resolveRequiredColumns(headerLookup)
  const missingRequiredColumns = Object.entries(requiredColumns)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missingRequiredColumns.length > 0) {
    throw new HttpError(
      400,
      `Invalid Shopify Orders CSV. Missing required Shopify columns: ${missingRequiredColumns.join(
        ', '
      )}.`
    )
  }

  const optionalColumns = resolveOptionalColumns(headerLookup)
  const dedupe = new Set<string>()
  const cleanedRows: DataRow[] = []

  for (const rawRow of parsed.data) {
    const cleaned = cleanShopifyRow(rawRow, requiredColumns as ParsedColumns, optionalColumns)
    if (!cleaned) {
      continue
    }

    const rowHash = String(cleaned.rowHash)
    if (dedupe.has(rowHash)) {
      continue
    }

    dedupe.add(rowHash)
    cleanedRows.push(cleaned)

    if (cleanedRows.length > MAX_ROWS) {
      throw new HttpError(
        413,
        `Shopify export has more than ${MAX_ROWS.toLocaleString()} valid line items after cleaning. Split the export and retry.`
      )
    }
  }

  if (cleanedRows.length === 0) {
    throw new HttpError(
      400,
      'Invalid Shopify Orders CSV. No valid order line items were found after cleaning.'
    )
  }

  const columns = Object.keys(cleanedRows[0])

  return {
    columns,
    rows: cleanedRows,
    previewRows: cleanedRows.slice(0, 50),
    rowCount: cleanedRows.length,
    fileType: 'SHOPIFY_ORDERS_CSV',
  }
}

function validateUploadedFile(file: File) {
  if (!file) {
    throw new HttpError(400, 'A Shopify Orders CSV file is required.')
  }

  const extension = getFileExtension(file.name)
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new HttpError(
      400,
      'Unsupported file type. Upload the Shopify Orders export as CSV.'
    )
  }

  if (file.size <= 0) {
    throw new HttpError(400, 'Uploaded CSV is empty.')
  }

  if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
    throw new HttpError(
      413,
      `File too large. Max supported file size is ${Math.round(
        MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024)
      )}MB.`
    )
  }
}

function getFileExtension(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase()?.trim()
  if (!extension) {
    throw new HttpError(400, 'CSV file extension is required.')
  }
  return extension
}

function buildHeaderLookup(headers: string[]): Map<string, string> {
  const lookup = new Map<string, string>()
  for (const header of headers) {
    lookup.set(normalizeHeaderKey(header), header)
  }
  return lookup
}

function resolveRequiredColumns(headerLookup: Map<string, string>) {
  return {
    orderName: findHeaderByAliases(headerLookup, REQUIRED_COLUMN_ALIASES.orderName),
    createdAt: findHeaderByAliases(headerLookup, REQUIRED_COLUMN_ALIASES.createdAt),
    lineitemQuantity: findHeaderByAliases(headerLookup, REQUIRED_COLUMN_ALIASES.lineitemQuantity),
    lineitemName: findHeaderByAliases(headerLookup, REQUIRED_COLUMN_ALIASES.lineitemName),
    lineitemPrice: findHeaderByAliases(headerLookup, REQUIRED_COLUMN_ALIASES.lineitemPrice),
  }
}

function resolveOptionalColumns(headerLookup: Map<string, string>): OptionalParsedColumns {
  return {
    orderId: findHeaderByAliases(headerLookup, OPTIONAL_COLUMN_ALIASES.orderId),
    currency: findHeaderByAliases(headerLookup, OPTIONAL_COLUMN_ALIASES.currency),
    cancelledAt: findHeaderByAliases(headerLookup, OPTIONAL_COLUMN_ALIASES.cancelledAt),
    refundedAmount: findHeaderByAliases(headerLookup, OPTIONAL_COLUMN_ALIASES.refundedAmount),
    financialStatus: findHeaderByAliases(headerLookup, OPTIONAL_COLUMN_ALIASES.financialStatus),
    lineitemSku: findHeaderByAliases(headerLookup, OPTIONAL_COLUMN_ALIASES.lineitemSku),
    lineitemVariant: findHeaderByAliases(headerLookup, OPTIONAL_COLUMN_ALIASES.lineitemVariant),
    lineitemDiscount: findHeaderByAliases(headerLookup, OPTIONAL_COLUMN_ALIASES.lineitemDiscount),
    orderTotal: findHeaderByAliases(headerLookup, OPTIONAL_COLUMN_ALIASES.orderTotal),
    costPerItem: findHeaderByAliases(headerLookup, OPTIONAL_COLUMN_ALIASES.costPerItem),
  }
}

function findHeaderByAliases(headerLookup: Map<string, string>, aliases: readonly string[]): string | null {
  const normalizedAliases = aliases.map((alias) => normalizeHeaderKey(alias))

  for (const alias of normalizedAliases) {
    const exactMatch = headerLookup.get(alias)
    if (exactMatch) {
      return exactMatch
    }
  }

  for (const [normalizedHeader, originalHeader] of headerLookup.entries()) {
    if (normalizedAliases.some((alias) => normalizedHeader.includes(alias) || alias.includes(normalizedHeader))) {
      return originalHeader
    }
  }

  return null
}

function cleanShopifyRow(
  rawRow: ParsedCsvRow,
  requiredColumns: ParsedColumns,
  optionalColumns: OptionalParsedColumns
): DataRow | null {
  const orderName = normalizeText(rawRow[requiredColumns.orderName])
  const lineitemName = normalizeText(rawRow[requiredColumns.lineitemName])
  const createdAt = parseShopifyDate(rawRow[requiredColumns.createdAt])
  const quantity = Math.max(0, Math.round(parseCurrencyNumber(rawRow[requiredColumns.lineitemQuantity]) ?? 0))
  const unitPrice = parseCurrencyNumber(rawRow[requiredColumns.lineitemPrice]) ?? 0

  if (!orderName || !lineitemName || !createdAt || quantity <= 0) {
    return null
  }

  const currency = normalizeCurrencyCode(optionalColumns.currency ? rawRow[optionalColumns.currency] : null)
  const lineitemDiscount = parseCurrencyNumber(
    optionalColumns.lineitemDiscount ? rawRow[optionalColumns.lineitemDiscount] : null
  ) ?? 0
  const refundedAmount = parseCurrencyNumber(
    optionalColumns.refundedAmount ? rawRow[optionalColumns.refundedAmount] : null
  ) ?? 0
  const orderTotal = parseCurrencyNumber(
    optionalColumns.orderTotal ? rawRow[optionalColumns.orderTotal] : null
  )
  const estimatedUnitCostRaw = parseCurrencyNumber(
    optionalColumns.costPerItem ? rawRow[optionalColumns.costPerItem] : null
  )

  const sku = normalizeText(optionalColumns.lineitemSku ? rawRow[optionalColumns.lineitemSku] : null)
  const variantTitle = normalizeVariantTitle(
    optionalColumns.lineitemVariant ? rawRow[optionalColumns.lineitemVariant] : null
  )
  const productName = variantTitle ? `${lineitemName} - ${variantTitle}` : lineitemName
  const lineGross = Math.max(0, quantity * unitPrice - lineitemDiscount)
  const financialStatus = normalizeText(
    optionalColumns.financialStatus ? rawRow[optionalColumns.financialStatus] : null
  )
  const cancelledAt = normalizeText(
    optionalColumns.cancelledAt ? rawRow[optionalColumns.cancelledAt] : null
  )
  const orderId =
    normalizeText(optionalColumns.orderId ? rawRow[optionalColumns.orderId] : null) ?? orderName
  const estimatedUnitCost =
    estimatedUnitCostRaw != null && Number.isFinite(estimatedUnitCostRaw)
      ? Math.max(0, estimatedUnitCostRaw)
      : null
  const estimatedLineCost =
    estimatedUnitCost != null ? round2(estimatedUnitCost * quantity) : null

  const isCancelled =
    Boolean(cancelledAt) ||
    /\bcancel|void/.test((financialStatus ?? '').toLowerCase())
  const isRefunded =
    refundedAmount > 0 || /\brefund/.test((financialStatus ?? '').toLowerCase())

  const createdAtIso = createdAt.toISOString()
  const createdDate = createdAtIso.slice(0, 10)
  const lineGrossUsd = convertCurrencyToUsd(lineGross, currency)
  const refundedAmountUsd = convertCurrencyToUsd(refundedAmount, currency)
  const orderTotalUsd =
    orderTotal != null ? convertCurrencyToUsd(orderTotal, currency) : null
  const estimatedLineCostUsd =
    estimatedLineCost != null ? convertCurrencyToUsd(estimatedLineCost, currency) : null

  const rowHash = createHash('sha256')
    .update(
      [
        orderId,
        createdDate,
        sku ?? '',
        lineitemName,
        variantTitle ?? '',
        String(quantity),
        String(round2(unitPrice)),
        String(round2(lineitemDiscount)),
      ].join('|')
    )
    .digest('hex')

  return {
    orderId,
    orderName,
    createdAt: createdAtIso,
    createdDate,
    financialStatus: financialStatus ?? null,
    currency,
    lineitemSku: sku ?? null,
    lineitemName,
    variantTitle: variantTitle ?? null,
    productName,
    quantity,
    unitPrice: round2(unitPrice),
    lineDiscount: round2(lineitemDiscount),
    lineGross: round2(lineGross),
    lineGrossUsd,
    refundedAmount: round2(refundedAmount),
    refundedAmountUsd,
    orderTotal: orderTotal != null ? round2(orderTotal) : null,
    orderTotalUsd,
    isCancelled,
    isRefunded,
    estimatedUnitCost: estimatedUnitCost != null ? round2(estimatedUnitCost) : null,
    estimatedLineCost,
    estimatedLineCostUsd,
    rowHash,
  }
}

function normalizeHeaderKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeText(value: unknown): string | null {
  if (value == null) {
    return null
  }

  const text = String(value).trim()
  return text.length > 0 ? text : null
}

function normalizeVariantTitle(value: unknown): string | null {
  const text = normalizeText(value)
  if (!text) {
    return null
  }

  const lowered = text.toLowerCase()
  if (lowered === 'default title' || lowered === 'default') {
    return null
  }

  return text
}

function normalizeCurrencyCode(value: unknown): string {
  const fallback = 'USD'
  const text = normalizeText(value)
  if (!text) {
    return fallback
  }

  const code = text.toUpperCase().slice(0, 3)
  return /^[A-Z]{3}$/.test(code) ? code : fallback
}

function parseCurrencyNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const text = normalizeText(value)
  if (!text) {
    return null
  }

  const hasParentheses = /^\(.*\)$/.test(text)
  let normalized = text.replace(/[()]/g, '')
  normalized = normalized.replace(/[\u2212\u2013\u2014]/g, '-')
  normalized = normalized.replace(/[^0-9,.\-]/g, '')

  if (!normalized || normalized === '-' || normalized === '.' || normalized === ',') {
    return null
  }

  if (normalized.includes(',') && normalized.includes('.')) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.')
    } else {
      normalized = normalized.replace(/,/g, '')
    }
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.')
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return hasParentheses ? -Math.abs(parsed) : parsed
}

function parseShopifyDate(value: unknown): Date | null {
  const text = normalizeText(value)
  if (!text) {
    return null
  }

  const direct = new Date(text)
  if (!Number.isNaN(direct.getTime())) {
    return direct
  }

  const dateMatch = text.match(
    /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  )

  if (!dateMatch) {
    return null
  }

  const first = Number(dateMatch[1])
  const second = Number(dateMatch[2])
  const year = Number(dateMatch[3])
  const hours = Number(dateMatch[4] ?? '0')
  const minutes = Number(dateMatch[5] ?? '0')
  const seconds = Number(dateMatch[6] ?? '0')

  const month = first > 12 ? second : first
  const day = first > 12 ? first : second
  const parsed = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds))

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function convertCurrencyToUsd(amount: number, currency: string): number {
  const rate = CURRENCY_TO_USD[currency] ?? 1
  return round2(amount * rate)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
