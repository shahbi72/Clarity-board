import { describe, expect, it } from 'vitest'
import type { ShopifySummary } from '@/lib/types/shopify'
import { detectInsightsFromSummaryChange } from '@/lib/server/business-sync/insights'

function buildSummary(overrides?: Partial<ShopifySummary['comparison7d']['deltas']>): ShopifySummary {
  return {
    source: 'user',
    datasetName: 'Store',
    rangeDays: 30,
    includeCancelled: false,
    hasData: true,
    currency: 'USD',
    totals: {
      totalRevenue: 1200,
      totalOrders: 48,
      averageOrderValue: 25,
      totalUnitsSold: 90,
      totalRefunded: 45,
      estimatedProfit: 320,
    },
    trend: [{ date: '2026-03-01', revenue: 1200 }],
    topProducts: [
      {
        productName: 'Classic Tee',
        sku: 'TEE-1',
        unitsSold: 20,
        revenue: 500,
      },
    ],
    comparison7d: {
      windowDays: 7,
      current: {
        from: '2026-02-23',
        to: '2026-03-01',
        revenue: 820,
        orders: 30,
        unitsSold: 55,
        refunded: 52,
        averageOrderValue: 27.33,
        refundRate: 0.0634,
        marginPct: 0.22,
      },
      previous: {
        from: '2026-02-16',
        to: '2026-02-22',
        revenue: 1020,
        orders: 40,
        unitsSold: 70,
        refunded: 22,
        averageOrderValue: 25.5,
        refundRate: 0.0216,
        marginPct: 0.34,
      },
      deltas: {
        revenuePct: -0.1961,
        ordersPct: -0.25,
        averageOrderValuePct: -0.08,
        refundRateDelta: 0.0418,
        refundRateRelative: 1.9352,
        marginDelta: -0.12,
        ...overrides,
      },
      topSkuDeclines: [
        {
          productName: 'Classic Tee',
          sku: 'TEE-1',
          previousRevenue: 500,
          currentRevenue: 300,
          deltaPct: -0.4,
          deltaValue: -200,
          contributionShare: 1,
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

describe('detectInsightsFromSummaryChange', () => {
  it('creates expected high-impact insight events for threshold breaches', () => {
    const current = buildSummary()

    const insights = detectInsightsFromSummaryChange({
      previous: null,
      current,
    })

    expect(insights.some((item) => item.type === 'revenue_drop_7d')).toBe(true)
    expect(insights.some((item) => item.type === 'orders_drop_7d')).toBe(true)
    expect(insights.some((item) => item.type === 'aov_drop_7d')).toBe(true)
    expect(insights.some((item) => item.type === 'refund_rate_spike_7d')).toBe(true)
    expect(insights.some((item) => item.type.startsWith('top_sku_decline_7d_'))).toBe(true)
    expect(insights.some((item) => item.type === 'margin_drop_7d')).toBe(true)
    expect(insights.every((item) => item.periodKey === '2026-02-23:2026-03-01')).toBe(true)

    const revenueInsight = insights.find((item) => item.type === 'revenue_drop_7d')
    expect(revenueInsight?.title).toContain('Revenue down')
    expect(revenueInsight?.title).toContain('-$200.00')
    expect(revenueInsight?.body).toContain('Suggested action:')

    const revenueDelta = revenueInsight?.deltaJson as
      | {
          absoluteImpact?: number
          primaryDriver?: { contributionShare?: number }
        }
      | undefined

    expect(revenueDelta?.absoluteImpact).toBe(200)
    expect(revenueDelta?.primaryDriver?.contributionShare).toBe(1)

    const skuInsight = insights.find((item) => item.type.startsWith('top_sku_decline_7d_'))
    const skuDelta = skuInsight?.deltaJson as { contributionShare?: number } | undefined
    expect(skuDelta?.contributionShare).toBe(1)
    expect(skuInsight?.body).toContain('Suggested action:')
  })

  it('returns info-level growth insights when metrics improve', () => {
    const current = buildSummary({
      revenuePct: 0.14,
      ordersPct: 0.12,
      averageOrderValuePct: 0.09,
      refundRateDelta: -0.01,
      refundRateRelative: -0.2,
      marginDelta: 0.03,
    })
    current.comparison7d.current.marginPct = 0.31
    current.comparison7d.topSkuDeclines = []

    const insights = detectInsightsFromSummaryChange({ previous: null, current })

    expect(insights.some((item) => item.type === 'revenue_up_7d')).toBe(true)
    expect(insights.some((item) => item.type === 'orders_up_7d')).toBe(true)
    expect(insights.some((item) => item.type === 'aov_up_7d')).toBe(true)
    expect(insights.some((item) => item.type === 'margin_drop_7d')).toBe(false)
  })
})
