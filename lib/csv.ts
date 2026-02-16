import Papa from 'papaparse'

export type Tx = {
  amount: number
  type: 'revenue' | 'expense'
  productName?: string
  date?: string
}

export type CsvParseMeta = {
  delimiter: string
  totalRows: number
  validRows: number
  skippedRows: number
  normalizedRows: number
  ambiguousDateRows: number
  headerDetected: boolean
  parseErrors: number
}

export type CsvParseResult = {
  txs: Tx[]
  meta: CsvParseMeta
}

type ParseRowsOptions = {
  delimiter?: string
  errors?: Papa.ParseError[]
}

type ParseContext = {
  ambiguousDateRows: number
}

const AMOUNT_KEYS = ['amount', 'amt', 'value', 'price', 'total', 'sum', 'cost']
const TYPE_KEYS = ['type', 'transactiontype', 'category', 'kind']
const PRODUCT_KEYS = ['productname', 'product', 'item', 'name', 'description', 'memo', 'details']
const DATE_KEYS = ['date', 'day', 'transactiondate']

const ALL_HEADER_KEYS = new Set<string>([
  ...AMOUNT_KEYS,
  ...TYPE_KEYS,
  ...PRODUCT_KEYS,
  ...DATE_KEYS,
])

const EXPENSE_KEYWORDS = ['expense', 'debit', 'cost', 'outflow', 'withdrawal', 'payment']
const REVENUE_KEYWORDS = ['revenue', 'credit', 'income', 'sale', 'deposit']
const ISO_CURRENCY_CODES = new Set<string>([
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'INR',
  'AUD',
  'CAD',
  'CHF',
  'CNY',
  'SGD',
  'HKD',
  'NZD',
  'SEK',
  'NOK',
  'DKK',
  'MXN',
  'BRL',
  'ZAR',
  'AED',
  'SAR',
])

export function parseCsvText(text: string): Tx[] {
  return parseCsvTextDetailed(text).txs
}

export function parseCsvTextDetailed(text: string): CsvParseResult {
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    delimiter: '',
    skipEmptyLines: 'greedy',
  })

  return parseRowsMatrix(parsed.data || [], {
    delimiter: parsed.meta.delimiter || ',',
    errors: parsed.errors || [],
  })
}

export function parseRowsMatrix(rows: string[][], options: ParseRowsOptions = {}): CsvParseResult {
  const preparedRows = prepareRows(rows)
  const parseErrors = options.errors?.length ?? 0
  const context: ParseContext = { ambiguousDateRows: 0 }
  if (preparedRows.rows.length === 0) {
    return {
      txs: [],
      meta: {
        delimiter: options.delimiter || ',',
        totalRows: 0,
        validRows: 0,
        skippedRows: 0,
        normalizedRows: preparedRows.normalizedRows,
        ambiguousDateRows: 0,
        headerDetected: false,
        parseErrors,
      },
    }
  }

  const headerDetected = isHeaderRow(preparedRows.rows[0])
  const txs = headerDetected
    ? parseRowsFromHeader(toHeaderRecords(preparedRows.rows), context)
    : parseRowsFromNoHeader(preparedRows.rows, context)

  const totalRows = headerDetected ? Math.max(preparedRows.rows.length - 1, 0) : preparedRows.rows.length

  return {
    txs,
    meta: {
      delimiter: options.delimiter || ',',
      totalRows,
      validRows: txs.length,
      skippedRows: Math.max(totalRows - txs.length, 0),
      normalizedRows: preparedRows.normalizedRows,
      ambiguousDateRows: context.ambiguousDateRows,
      headerDetected,
      parseErrors,
    },
  }
}

export function parseRowsFromHeader(rows: Record<string, string>[], context?: ParseContext): Tx[] {
  return rows
    .map((row) => {
      const amount = parseAmountValue(pickValue(row, AMOUNT_KEYS))
      if (amount == null) return null

      const rawType = String(pickValue(row, TYPE_KEYS) ?? '')
      const type = inferType(rawType, amount)

      const productName = readOptionalText(pickValue(row, PRODUCT_KEYS))
      const dateResult = inferDateValue(readOptionalText(pickValue(row, DATE_KEYS)))
      if (dateResult.ambiguous && context) {
        context.ambiguousDateRows += 1
      }

      const tx: Tx = { amount: Math.abs(amount), type }
      if (productName) tx.productName = productName
      if (dateResult.value) tx.date = dateResult.value
      return tx
    })
    .filter((row): row is Tx => row !== null)
}

export function parseRowsFromNoHeader(rows: string[][], context?: ParseContext): Tx[] {
  return rows
    .map((cols) => {
      if (!cols || cols.length === 0) return null

      let amount: number | null = null
      let type: Tx['type'] | undefined
      let productName: string | undefined
      let date: string | undefined

      for (const cell of cols) {
        const value = String(cell ?? '').trim()
        if (!value) continue

        if (!type) {
          const inferredType = inferTypeKeyword(value)
          if (inferredType) {
            type = inferredType
            continue
          }
        }

        if (amount == null) {
          const parsedAmount = parseAmountValue(value)
          if (parsedAmount != null) {
            amount = parsedAmount
            continue
          }
        }

        if (!date) {
          const dateResult = inferDateValue(value)
          if (dateResult.ambiguous && context) {
            context.ambiguousDateRows += 1
          }
          if (dateResult.value) {
            date = dateResult.value
            continue
          }
        }

        if (!productName) {
          productName = value
        }
      }

      if (amount == null) return null

      const tx: Tx = {
        amount: Math.abs(amount),
        type: type ?? (amount < 0 ? 'expense' : 'revenue'),
      }
      if (productName) tx.productName = productName
      if (date) tx.date = date
      return tx
    })
    .filter((row): row is Tx => row !== null)
}

function prepareRows(rows: string[][]): { rows: string[][]; normalizedRows: number } {
  const cleanRows = rows
    .map((row) => row.map((cell) => String(cell ?? '').trim()))
    .filter((row) => row.some((cell) => cell !== ''))

  const maxColumns = cleanRows.reduce((max, row) => Math.max(max, row.length), 0)
  if (maxColumns === 0) {
    return { rows: [], normalizedRows: 0 }
  }

  let normalizedRows = 0
  const paddedRows = cleanRows.map((row) => {
    if (row.length === maxColumns) return row
    normalizedRows += 1
    return [...row, ...new Array(maxColumns - row.length).fill('')]
  })

  return { rows: paddedRows, normalizedRows }
}

function isHeaderRow(firstRow: string[]): boolean {
  const normalized = firstRow.map((cell) => normalizeHeaderKey(cell)).filter(Boolean)
  if (normalized.length === 0) return false
  const recognized = normalized.filter((key) => ALL_HEADER_KEYS.has(key))
  const hasAmount = normalized.some((key) => AMOUNT_KEYS.includes(key))
  return hasAmount && recognized.length >= 1
}

function toHeaderRecords(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return []
  const [headerRow, ...dataRows] = rows
  const safeHeaders = headerRow.map((header, index) => header || `column_${index + 1}`)

  return dataRows.map((row) => {
    const record: Record<string, string> = {}
    safeHeaders.forEach((header, index) => {
      record[header] = row[index] ?? ''
    })
    return record
  })
}

function inferType(rawType: string, amount: number): Tx['type'] {
  const fromKeyword = inferTypeKeyword(rawType)
  if (fromKeyword) return fromKeyword
  return amount < 0 ? 'expense' : 'revenue'
}

function inferTypeKeyword(rawType: string): Tx['type'] | undefined {
  const normalized = rawType.toLowerCase().trim()
  if (!normalized) return undefined
  if (EXPENSE_KEYWORDS.includes(normalized)) return 'expense'
  if (REVENUE_KEYWORDS.includes(normalized)) return 'revenue'
  return undefined
}

function parseAmountValue(value: string | undefined): number | null {
  const text = String(value ?? '').trim()
  if (!text) return null

  // Avoid treating values like 2026-02-10 as numeric amounts.
  if (/^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$/.test(text)) return null

  const hasParentheses = /^\((.+)\)$/.test(text)
  let normalized = text.replace(/[()]/g, '')
  normalized = stripKnownCurrencyCodes(normalized)
  normalized = normalized.replace(/[\u2212\u2013\u2014]/g, '-')
  normalized = normalized.replace(/[\p{Sc}\s]/gu, '')
  if (/[a-z]/i.test(normalized)) return null

  if (!/[0-9]/.test(normalized)) return null

  const lastComma = normalized.lastIndexOf(',')
  const lastDot = normalized.lastIndexOf('.')

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, '').replace(',', '.')
    } else {
      normalized = normalized.replace(/,/g, '')
    }
  } else if (lastComma > -1) {
    const decimalDigits = normalized.length - lastComma - 1
    normalized =
      decimalDigits > 0 && decimalDigits <= 2
        ? normalized.replace(',', '.')
        : normalized.replace(/,/g, '')
  } else {
    normalized = normalized.replace(/,/g, '')
  }

  const sign = normalized.startsWith('-') ? -1 : 1
  normalized = normalized.replace(/[+-]/g, '')

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null

  const amount = parsed * sign
  return hasParentheses ? -Math.abs(amount) : amount
}

function stripKnownCurrencyCodes(value: string): string {
  let normalized = value.trim()

  const prefixMatch = normalized.match(/^([A-Za-z]{3})(?=\s*[+-]?\d)/)
  if (prefixMatch && ISO_CURRENCY_CODES.has(prefixMatch[1].toUpperCase())) {
    normalized = normalized.slice(prefixMatch[0].length).trimStart()
  }

  const suffixMatch = normalized.match(/([A-Za-z]{3})$/)
  if (suffixMatch && ISO_CURRENCY_CODES.has(suffixMatch[1].toUpperCase())) {
    const base = normalized.slice(0, -suffixMatch[1].length)
    if (/[0-9)]\s*$/.test(base)) {
      normalized = base.trimEnd()
    }
  }

  return normalized
}

function inferDateValue(value: string | undefined): { value?: string; ambiguous: boolean } {
  const text = String(value ?? '').trim()
  if (!text) return { value: undefined, ambiguous: false }

  const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (iso) {
    return {
      value: toIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3])) ?? text,
      ambiguous: false,
    }
  }

  const numeric = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/)
  if (numeric) {
    const first = Number(numeric[1])
    const second = Number(numeric[2])
    const year = normalizeYear(Number(numeric[3]))
    // Slash dates default to MM/DD/YYYY unless the first segment cannot be a month.
    const month = first > 12 && second <= 12 ? second : first
    const day = first > 12 && second <= 12 ? first : second
    const isAmbiguous = first >= 1 && first <= 12 && second >= 1 && second <= 12
    return {
      value: toIsoDate(year, month, day) ?? text,
      ambiguous: isAmbiguous,
    }
  }

  if (!/[a-z]/i.test(text)) {
    return { value: undefined, ambiguous: false }
  }

  const timestamp = Date.parse(text)
  if (!Number.isNaN(timestamp)) {
    return { value: new Date(timestamp).toISOString().slice(0, 10), ambiguous: false }
  }

  return { value: undefined, ambiguous: false }
}

function toIsoDate(year: number, month: number, day: number): string | undefined {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return undefined
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined

  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined
  }

  return `${year.toString().padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(
    day
  ).padStart(2, '0')}`
}

function normalizeYear(year: number): number {
  if (year >= 100) return year
  return year >= 70 ? 1900 + year : 2000 + year
}

function readOptionalText(value: string | undefined): string | undefined {
  const text = String(value ?? '').trim()
  return text || undefined
}

function normalizeHeaderKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function pickValue(row: Record<string, string>, keys: string[]): string | undefined {
  const normalized = new Map<string, string>()
  for (const k of Object.keys(row)) {
    normalized.set(normalizeHeaderKey(k), k)
  }
  for (const key of keys) {
    const original = normalized.get(normalizeHeaderKey(key))
    if (original) {
      return row[original]
    }
  }
  return undefined
}

