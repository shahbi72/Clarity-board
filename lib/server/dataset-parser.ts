import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { HttpError } from '@/lib/server/http-error'
import type { DataRow } from '@/lib/types/data-pipeline'

export const MAX_UPLOAD_FILE_SIZE_BYTES = 25 * 1024 * 1024
const MAX_COLUMNS = 200
const MAX_ROWS = 100_000
const SUPPORTED_EXTENSIONS = new Set(['csv', 'xlsx', 'xls'])

const HEADER_HINTS = [
  'date',
  'transaction',
  'amount',
  'total',
  'value',
  'type',
  'category',
  'revenue',
  'expense',
  'product',
  'customer',
  'name',
]

export type ParsedDatasetUpload = {
  columns: string[]
  rows: DataRow[]
  previewRows: DataRow[]
  rowCount: number
  fileType: string
}

export async function parseUploadedDatasetFile(file: File): Promise<ParsedDatasetUpload> {
  validateUploadedFile(file)

  const extension = getFileExtension(file.name)
  const matrix = extension === 'csv' ? await parseCsvFile(file) : await parseExcelFile(file)
  const prepared = prepareRows(matrix)

  if (prepared.length === 0) {
    throw new HttpError(400, 'No rows found in file.')
  }

  const hasHeader = shouldTreatFirstRowAsHeader(prepared[0])
  const maxColumnCount = Math.min(
    MAX_COLUMNS,
    Math.max(...prepared.map((row) => row.length))
  )

  const columns = hasHeader
    ? sanitizeHeaderColumns(prepared[0], maxColumnCount)
    : buildDefaultColumns(maxColumnCount)

  const dataRows = hasHeader ? prepared.slice(1) : prepared
  const normalizedRows: DataRow[] = []

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex += 1) {
    if (normalizedRows.length >= MAX_ROWS) {
      throw new HttpError(
        413,
        `Dataset has more than ${MAX_ROWS.toLocaleString()} rows after cleaning. Split the file and retry.`
      )
    }

    const row = dataRows[rowIndex] ?? []
    const record: DataRow = {}
    let hasValue = false

    for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
      const columnName = columns[columnIndex]
      const rawCell = row[columnIndex] ?? ''
      const value = normalizeCellValue(rawCell)
      record[columnName] = value
      if (value !== null) {
        hasValue = true
      }
    }

    if (hasValue) {
      normalizedRows.push(record)
    }
  }

  if (normalizedRows.length === 0) {
    throw new HttpError(400, 'No valid data rows found after parsing.')
  }

  return {
    columns,
    rows: normalizedRows,
    previewRows: normalizedRows.slice(0, 50),
    rowCount: normalizedRows.length,
    fileType: extension.toUpperCase(),
  }
}

function validateUploadedFile(file: File) {
  if (!file) {
    throw new HttpError(400, 'File is required.')
  }

  const extension = getFileExtension(file.name)
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new HttpError(400, 'Unsupported file type. Please upload CSV or Excel files.')
  }

  if (file.size <= 0) {
    throw new HttpError(400, 'Uploaded file is empty.')
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
    throw new HttpError(400, 'File must include an extension.')
  }
  return extension
}

async function parseCsvFile(file: File): Promise<string[][]> {
  const text = await file.text()
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    delimiter: '',
    skipEmptyLines: 'greedy',
  })

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new HttpError(400, 'Unable to parse CSV file.')
  }

  return parsed.data.map((row) => row.map((cell) => String(cell ?? '')))
}

async function parseExcelFile(file: File): Promise<string[][]> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    throw new HttpError(400, 'Excel file does not contain any sheet.')
  }

  const sheet = workbook.Sheets[firstSheetName]
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
  })

  return matrix.map((row) => row.map((cell) => String(cell ?? '')))
}

function prepareRows(rows: string[][]): string[][] {
  return rows
    .map((row) => row.map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell !== ''))
}

function shouldTreatFirstRowAsHeader(firstRow: string[]): boolean {
  const nonEmpty = firstRow.map((cell) => cell.trim()).filter(Boolean)
  if (nonEmpty.length === 0) return false

  const alphaLikeCount = nonEmpty.filter((cell) => /[A-Za-z]/.test(cell)).length
  const numericLikeCount = nonEmpty.filter((cell) => /^-?\d+([.,]\d+)?$/.test(cell)).length
  const hintCount = nonEmpty.filter((cell) =>
    HEADER_HINTS.some((hint) => normalizeColumnKey(cell).includes(hint))
  ).length

  return (
    hintCount > 0 ||
    (alphaLikeCount >= Math.ceil(nonEmpty.length / 2) && alphaLikeCount >= numericLikeCount)
  )
}

function sanitizeHeaderColumns(headerRow: string[], maxColumnCount: number): string[] {
  const taken = new Set<string>()
  const columns: string[] = []

  for (let index = 0; index < maxColumnCount; index += 1) {
    const original = headerRow[index] ?? ''
    const fallback = `column_${index + 1}`
    const baseName = sanitizeColumnKey(original) || fallback
    const deduped = dedupeColumnName(baseName, taken)
    columns.push(deduped)
    taken.add(deduped)
  }

  return columns
}

function buildDefaultColumns(maxColumnCount: number): string[] {
  return Array.from({ length: maxColumnCount }, (_, index) => `column_${index + 1}`)
}

function sanitizeColumnKey(value: string): string {
  return value
    .trim()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 60)
}

function dedupeColumnName(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  let counter = 2
  while (taken.has(`${base}_${counter}`)) {
    counter += 1
  }
  return `${base}_${counter}`
}

function normalizeColumnKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeCellValue(value: string): string | number | boolean | null {
  const text = String(value ?? '').trim()
  if (!text) return null

  const lower = text.toLowerCase()
  if (lower === 'true') return true
  if (lower === 'false') return false

  const numericValue = parseNumericValue(text)
  if (numericValue != null) return numericValue

  return text.slice(0, 10_000)
}

function parseNumericValue(value: string): number | null {
  if (!/[0-9]/.test(value)) return null

  const hasParentheses = /^\((.+)\)$/.test(value)
  let normalized = value.replace(/[()]/g, '')
  normalized = normalized.replace(/[\u2212\u2013\u2014]/g, '-')
  normalized = normalized.replace(/[$,]/g, '')
  normalized = normalized.replace(/\s+/g, '')

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null

  return hasParentheses ? -Math.abs(parsed) : parsed
}
