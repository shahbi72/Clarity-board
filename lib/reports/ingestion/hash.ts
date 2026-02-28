import crypto from 'crypto'
import type { CleanRow } from '@/lib/reports/cleaning/engine'

export function stableRowHash(row: CleanRow): string {
  const normalized = JSON.stringify(
    Object.entries(row)
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce<Record<string, unknown>>((acc, [key, value]) => {
        acc[key] = value
        return acc
      }, {})
  )

  return crypto.createHash('sha256').update(normalized).digest('hex')
}

export function selectRowKey(row: CleanRow, index: number): string {
  const preferred = ['id', 'order_id', 'transaction_id', 'record_id']

  for (const key of preferred) {
    const value = row[key]
    if (value !== null && value !== undefined && String(value).trim()) {
      return `${key}:${String(value).trim()}`
    }
  }

  return `row:${index}`
}

