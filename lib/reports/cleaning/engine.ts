import { parse, parseISO, isValid, format } from 'date-fns'

export type RawCell = string | number | boolean | null | undefined
export type RawRow = RawCell[]
export type CleanValue = string | number | boolean | null
export type CleanRow = Record<string, CleanValue>

export type ColumnType = 'number' | 'date' | 'boolean' | 'string' | 'unknown'

export type ColumnProfile = {
  type: ColumnType
  confidence: number
  nonNullCount: number
}

export type CleaningResult = {
  headerRowIndex: number
  headers: string[]
  cleanedRows: CleanRow[]
  duplicateRowCount: number
  columnProfiles: Record<string, ColumnProfile>
}

const DATE_FORMATS = [
  'yyyy-MM-dd',
  'MM/dd/yyyy',
  'dd/MM/yyyy',
  'dd.MM.yyyy',
  'MM-dd-yyyy',
  'yyyy/MM/dd',
  'MMM d, yyyy',
  'd MMM yyyy',
  'M/d/yy',
  'd/M/yy',
]

function normalizeHeader(raw: string, index: number): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized || `column_${index + 1}`
}

function uniqueHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>()

  return headers.map((header) => {
    const count = seen.get(header) ?? 0
    seen.set(header, count + 1)

    if (count === 0) {
      return header
    }

    return `${header}_${count + 1}`
  })
}

function toStringValue(value: RawCell): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim()
}

function inferHeaderRow(rows: RawRow[]): number {
  const sampleSize = Math.min(rows.length, 10)
  let bestIndex = 0
  let bestScore = -1

  for (let i = 0; i < sampleSize; i += 1) {
    const values = rows[i].map(toStringValue).filter(Boolean)
    const nonEmptyCount = values.length

    if (nonEmptyCount === 0) {
      continue
    }

    const uniqueCount = new Set(values).size
    const alphaCount = values.filter((value) => /[A-Za-z]/.test(value)).length
    const score = nonEmptyCount * 2 + uniqueCount + alphaCount

    if (score > bestScore) {
      bestScore = score
      bestIndex = i
    }
  }

  return bestIndex
}

function parseNumeric(text: string): number | null {
  const cleaned = text
    .replace(/[\$€£¥??]/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')

  if (!cleaned) {
    return null
  }

  const negativeWrapped = /^\((.+)\)$/.exec(cleaned)
  const numericText = negativeWrapped ? `-${negativeWrapped[1]}` : cleaned

  if (!/^-?\d+(\.\d+)?$/.test(numericText)) {
    return null
  }

  const parsed = Number.parseFloat(numericText)
  return Number.isFinite(parsed) ? parsed : null
}

function parseDateText(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed) {
    return null
  }

  const isoCandidate = parseISO(trimmed)
  if (isValid(isoCandidate)) {
    return format(isoCandidate, 'yyyy-MM-dd')
  }

  for (const pattern of DATE_FORMATS) {
    const parsed = parse(trimmed, pattern, new Date())
    if (isValid(parsed)) {
      return format(parsed, 'yyyy-MM-dd')
    }
  }

  return null
}

function parseCellValue(input: RawCell): CleanValue {
  if (input === null || input === undefined) {
    return null
  }

  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : null
  }

  if (typeof input === 'boolean') {
    return input
  }

  const value = String(input).trim()
  if (!value) {
    return null
  }

  if (/^(true|false)$/i.test(value)) {
    return value.toLowerCase() === 'true'
  }

  const numericValue = parseNumeric(value)
  if (numericValue !== null) {
    return numericValue
  }

  const dateValue = parseDateText(value)
  if (dateValue) {
    return dateValue
  }

  return value
}

function inferColumnProfiles(rows: CleanRow[], headers: string[]): Record<string, ColumnProfile> {
  const profiles: Record<string, ColumnProfile> = {}

  for (const header of headers) {
    const counts: Record<ColumnType, number> = {
      number: 0,
      date: 0,
      boolean: 0,
      string: 0,
      unknown: 0,
    }

    let nonNullCount = 0

    for (const row of rows) {
      const value = row[header]
      if (value === null || value === undefined) {
        continue
      }

      nonNullCount += 1

      if (typeof value === 'number') {
        counts.number += 1
      } else if (typeof value === 'boolean') {
        counts.boolean += 1
      } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        counts.date += 1
      } else if (typeof value === 'string') {
        counts.string += 1
      }
    }

    if (nonNullCount === 0) {
      profiles[header] = { type: 'unknown', confidence: 0, nonNullCount: 0 }
      continue
    }

    const typedEntries = Object.entries(counts) as Array<[ColumnType, number]>
    typedEntries.sort((a, b) => b[1] - a[1])
    const [bestType, bestCount] = typedEntries[0]

    profiles[header] = {
      type: bestType,
      confidence: Number((bestCount / nonNullCount).toFixed(2)),
      nonNullCount,
    }
  }

  return profiles
}

function isRowEmpty(row: CleanRow, headers: string[]): boolean {
  return headers.every((header) => row[header] === null)
}

export function cleanSheetRows(rows: RawRow[]): CleaningResult {
  if (!rows.length) {
    return {
      headerRowIndex: 0,
      headers: [],
      cleanedRows: [],
      duplicateRowCount: 0,
      columnProfiles: {},
    }
  }

  const headerRowIndex = inferHeaderRow(rows)
  const rawHeaders = rows[headerRowIndex].map((cell, index) => normalizeHeader(String(cell ?? ''), index))
  const headers = uniqueHeaders(rawHeaders)

  const cleanedRows: CleanRow[] = []
  const seenHashes = new Set<string>()
  let duplicateRowCount = 0

  for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
    const rawRow = rows[i]
    const row: CleanRow = {}

    headers.forEach((header, index) => {
      row[header] = parseCellValue(rawRow[index])
    })

    if (isRowEmpty(row, headers)) {
      continue
    }

    const hash = JSON.stringify(row)
    if (seenHashes.has(hash)) {
      duplicateRowCount += 1
      continue
    }

    seenHashes.add(hash)
    cleanedRows.push(row)
  }

  const columnProfiles = inferColumnProfiles(cleanedRows, headers)

  return {
    headerRowIndex,
    headers,
    cleanedRows,
    duplicateRowCount,
    columnProfiles,
  }
}

