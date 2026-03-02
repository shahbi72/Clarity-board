import { describe, expect, it } from 'vitest'
import { calculateStoreHealthScore } from '@/lib/shopify/health-score'
import type { ShopifySummary } from '@/lib/types/shopify'

function buildSummary(): ShopifySummary {
  return {
    source: 'user',
    datasetName: 'Health Store',
    rangeDays: 30,
    includeCancelled: false,
    hasData: true,
    currency: 'USD',
    totals: {
      totalRevenue: 1000,
      totalOrders: 40,
      averageOrderValue: 25,
      totalUnitsSold: 90,
      totalRefunded: 60,
      estimatedProfit: 220,
    },
    trend: [{ date: '2026-03-01', revenue: 1000 }],
    topProducts: [
      {
        productName: 'Black Hoodie',
        sku: 'HOODIE-BLK',
        unitsSold: 30,
        revenue: 700,
      },
      {
        productName: 'Classic Tee',
        sku: 'TEE-1',
        unitsSold: 15,
        revenue: 200,
      },
    ],
    comparison7d: {
      windowDays: 7,
      current: {
        from: '2026-02-23',
        to: '2026-03-01',
        revenue: 880,
        orders: 33,
        unitsSold: 70,
        refunded: 60,
        averageOrderValue: 26.67,
        refundRate: 0.06,
        marginPct: 0.22,
      },
      previous: {
        from: '2026-02-16',
        to: '2026-02-22',
        revenue: 1000,
        orders: 40,
        unitsSold: 86,
        refunded: 30,
        averageOrderValue: 25,
        refundRate: 0.03,
        marginPct: 0.31,
      },
      deltas: {
        revenuePct: -0.12,
        ordersPct: -0.175,
        averageOrderValuePct: 0.0668,
        refundRateDelta: 0.03,
        refundRateRelative: 1,
        marginDelta: -0.09,
      },
      topSkuDeclines: [
        {
          productName: 'Black Hoodie',
          sku: 'HOODIE-BLK',
          previousRevenue: 800,
          currentRevenue: 620,
          deltaPct: -0.225,
          deltaValue: -180,
          contributionShare: 0.9,
        },
      ],
    },
    excludedCancelledOrders: 0,
    deadStock: {
      lookbackDays: 30,
      items: [],
    },
    salesTiming: {
      bestDay: 'Tuesday',
      bestHour: '7PM',
      ordersByDay: [],
      ordersByHour: [],
    },
  }
}

describe('calculateStoreHealthScore', () => {
  it('returns a deterministic score for known fixtures', () => {
    const summary = buildSummary()

    const first = calculateStoreHealthScore({
      summary,
      marginPct: 0.22,
    })
    const second = calculateStoreHealthScore({
      summary,
      marginPct: 0.22,
    })

    expect(first.score).toBe(39)
    expect(first.label).toBe('Risk')
    expect(second.score).toBe(39)
    expect(first.factors[0]?.id).toBe('concentration')
  })

  it('treats missing margin inputs as neutral instead of failing score calculation', () => {
    const summary = buildSummary()
    const result = calculateStoreHealthScore({
      summary,
      marginPct: null,
    })

    const marginFactor = result.factors.find((item) => item.id === 'margin')
    expect(marginFactor?.score).toBe(18)
    expect(marginFactor?.reason).toContain('neutral')
  })
})
