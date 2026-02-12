import type { Tx } from '@/lib/csv'

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
    if (tx.type === 'expense') {
      expenses += tx.amount
      continue
    }
    revenue += tx.amount
    if (tx.productName) {
      productRevenue.set(tx.productName, (productRevenue.get(tx.productName) ?? 0) + tx.amount)
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
