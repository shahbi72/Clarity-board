import Papa from 'papaparse'

export type Tx = {
  amount: number
  type: 'revenue' | 'expense'
  productName?: string
  date?: string
}

export function parseCsvText(text: string): Tx[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  })

  const fromHeader = parseRowsFromHeader(result.data || [])
  if (fromHeader.length > 0) {
    return fromHeader
  }

  const fallback = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: true,
  })

  return parseRowsFromNoHeader(fallback.data || [])
}

export function parseRowsFromHeader(rows: Record<string, string>[]): Tx[] {
  return rows
    .map((row) => {
      const rawAmount = pickValue(row, [
        'amount',
        'amt',
        'value',
        'price',
        'total',
        'sum',
        'cost',
      ])
      if (rawAmount == null || String(rawAmount).trim() === '') return null
      const amount = Number(String(rawAmount).replace(/[$,]/g, '').trim())
      if (Number.isNaN(amount)) return null

      const rawType = String(
        pickValue(row, ['type', 'transactiontype', 'category', 'kind']) ?? ''
      )
        .toLowerCase()
        .trim()
      let type: Tx['type'] = rawType === 'expense' ? 'expense' : 'revenue'
      if (rawType === 'debit') type = 'expense'
      if (rawType === 'credit') type = 'revenue'
      if (amount < 0) type = 'expense'

      const productName =
        String(
          pickValue(row, [
            'productname',
            'product',
            'item',
            'name',
            'description',
            'memo',
            'details',
          ]) ?? ''
        ).trim() || undefined
      const date =
        String(pickValue(row, ['date', 'day', 'transactiondate']) ?? '').trim() ||
        undefined

      return { amount: Math.abs(amount), type, productName, date }
    })
    .filter(Boolean) as Tx[]
}

export function parseRowsFromNoHeader(rows: string[][]): Tx[] {
  return rows
    .map((cols) => {
      if (!cols || cols.length === 0) return null

      const cleaned = cols.map((c) => String(c ?? '').trim())
      if (cleaned.every((c) => c === '')) return null

      let amount: number | null = null
      let type: Tx['type'] | null = null
      let productName: string | undefined
      let date: string | undefined

      for (const cell of cleaned) {
        const lower = cell.toLowerCase()
        if (!type && (lower === 'expense' || lower === 'revenue')) {
          type = lower === 'expense' ? 'expense' : 'revenue'
          continue
        }

        if (amount == null) {
          const numeric = Number(cell.replace(/[$,]/g, ''))
          if (!Number.isNaN(numeric) && cell.replace(/[$,]/g, '').trim() !== '') {
            amount = numeric
            continue
          }
        }

        if (!date && /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(cell)) {
          date = cell
          continue
        }

        if (!productName && cell !== '') {
          productName = cell
        }
      }

      if (amount == null) return null
      return {
        amount: Math.abs(amount),
        type: type ?? (amount < 0 ? 'expense' : 'revenue'),
        productName,
        date,
      }
    })
    .filter(Boolean) as Tx[]
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
