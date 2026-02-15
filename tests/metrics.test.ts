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

  it('ignores invalid amounts and trims product names safely', () => {
    const noisyTxs = [
      { amount: 200, type: 'revenue', productName: '  Premium  ' },
      { amount: -50, type: 'expense', productName: 'Fees' },
      { amount: Number.NaN, type: 'revenue', productName: 'Broken' },
      { amount: Number.POSITIVE_INFINITY, type: 'expense', productName: 'Bad' },
      { amount: 30, type: 'revenue', productName: '   ' },
    ] as Parameters<typeof calcDailyMetrics>[0]

    const metrics = calcDailyMetrics(noisyTxs)

    expect(metrics.revenue).toBe(230)
    expect(metrics.expenses).toBe(50)
    expect(metrics.profit).toBe(180)
    expect(metrics.topProductName).toBe('Premium')
    expect(metrics.topProductRevenue).toBe(200)
  })

  it('handles refunds and missing optional columns without breaking aggregates', () => {
    const txsWithRefunds = [
      { amount: 1200, type: 'revenue' as const, productName: 'Storefront' },
      { amount: -450, type: 'expense' as const },
      { amount: -125 as unknown as number, type: 'expense' as const, productName: 'Storefront' },
      { amount: 600, type: 'revenue' as const, productName: undefined },
      { amount: 0, type: 'expense' as const, productName: '' },
    ]

    const metrics = calcDailyMetrics(txsWithRefunds as Parameters<typeof calcDailyMetrics>[0])

    expect(metrics.revenue).toBe(1800)
    expect(metrics.expenses).toBe(575)
    expect(metrics.profit).toBe(1225)
    expect(metrics.topProductName).toBe('Storefront')
    expect(metrics.topProductRevenue).toBe(1200)
  })
})
