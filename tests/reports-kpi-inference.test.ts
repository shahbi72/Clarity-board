import { describe, expect, it } from 'vitest'
import { inferKpis } from '@/lib/reports/kpi/inference'

describe('inferKpis', () => {
  it('detects core KPI columns and supports derived profit', () => {
    const headers = ['date', 'sales', 'ad_spend', 'orders', 'conversion_rate']
    const rows = [
      {
        date: '2026-01-20',
        sales: 1200,
        ad_spend: 400,
        orders: 22,
        conversion_rate: 0.13,
      },
    ]

    const profiles = {
      date: { type: 'date', confidence: 1, nonNullCount: 1 },
      sales: { type: 'number', confidence: 1, nonNullCount: 1 },
      ad_spend: { type: 'number', confidence: 1, nonNullCount: 1 },
      orders: { type: 'number', confidence: 1, nonNullCount: 1 },
      conversion_rate: { type: 'number', confidence: 1, nonNullCount: 1 },
    } as const

    const result = inferKpis({
      headers,
      rows,
      profiles: profiles as never,
    })

    expect(result.dateColumn).toBe('date')
    expect(result.revenueColumn).toBe('sales')
    expect(result.costColumn).toBe('ad_spend')
    expect(result.ordersColumn).toBe('orders')
    expect(result.conversionRateColumn).toBe('conversion_rate')
    expect(result.derivedProfit).toBe(true)
  })

  it('prefers explicit profit column when available', () => {
    const headers = ['date', 'revenue', 'cost', 'profit']
    const rows = [{ date: '2026-01-20', revenue: 1000, cost: 700, profit: 300 }]
    const profiles = {
      date: { type: 'date', confidence: 1, nonNullCount: 1 },
      revenue: { type: 'number', confidence: 1, nonNullCount: 1 },
      cost: { type: 'number', confidence: 1, nonNullCount: 1 },
      profit: { type: 'number', confidence: 1, nonNullCount: 1 },
    } as const

    const result = inferKpis({
      headers,
      rows,
      profiles: profiles as never,
    })

    expect(result.profitColumn).toBe('profit')
    expect(result.derivedProfit).toBe(false)
  })
})

