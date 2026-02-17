export type Tx = {
  amount: number
  type: 'revenue' | 'expense'
  productName?: string
  date?: string
}

export type DailyMetrics = {
  revenue: number
  expenses: number
  profit: number
  topProductName?: string
  topProductRevenue?: number
}

export function calcDailyMetrics(txs: Tx[]): DailyMetrics {
  let revenue = 0
  let expenses = 0
  const productRevenue = new Map<string, number>()

  for (const tx of txs) {
    const amount = sanitizeAmount(tx.amount)
    if (amount == null) {
      continue
    }

    if (tx.type === 'expense') {
      expenses += amount
      continue
    }
    revenue += amount

    const productName = normalizeProductName(tx.productName)
    if (productName) {
      productRevenue.set(productName, (productRevenue.get(productName) ?? 0) + amount)
    }
  }

  let topProductName: string | undefined
  let topProductRevenue = 0
  for (const [name, value] of productRevenue) {
    if (value > topProductRevenue) {
      topProductName = name
      topProductRevenue = value
    }
  }

  return {
    revenue,
    expenses,
    profit: revenue - expenses,
    topProductName,
    topProductRevenue: topProductName ? topProductRevenue : undefined,
  }
}

function sanitizeAmount(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return null
  return Math.abs(numeric)
}

function normalizeProductName(value: string | undefined): string | undefined {
  const name = value?.trim()
  return name ? name : undefined
}
