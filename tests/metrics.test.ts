import { describe, it, expect } from 'vitest'
import { calcDailyMetrics } from '@/lib/metrics'

const sampleTxs = [
  { amount: 100, type: 'revenue' as const, productName: 'A' },
  { amount: 40, type: 'expense' as const, productName: 'A' },
  { amount: 60, type: 'revenue' as const, productName: 'B' },
]

describe('calcDailyMetrics', () => {
  it('returns revenue, expenses, profit, and top product', () => {
    const metrics = calcDailyMetrics(sampleTxs)

    expect(metrics.revenue).toBe(160)
    expect(metrics.expenses).toBe(40)
    expect(metrics.profit).toBe(120)
    expect(metrics.topProductName).toBe('A')
    expect(metrics.topProductRevenue).toBe(100)
  })
})
