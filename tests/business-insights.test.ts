import { describe, expect, it } from 'vitest'
import type { ShopifySummary } from '@/lib/types/shopify'
import { detectInsightsFromSummaryChange } from '@/lib/server/business-sync/insights'

function buildSummary(overrides: Partial<ShopifySummary['totals']>, topProduct = 'Classic Tee'): ShopifySummary {
  return {
    source: 'user',
    datasetName: 'Store',
    rangeDays: 30,
    includeCancelled: false,
    hasData: true,
    currency: 'USD',
    totals: {
      totalRevenue: overrides.totalRevenue ?? 1000,
      totalOrders: overrides.totalOrders ?? 40,
      averageOrderValue: overrides.averageOrderValue ?? 25,
      totalUnitsSold: overrides.totalUnitsSold ?? 80,
      totalRefunded: overrides.totalRefunded ?? 20,
      estimatedProfit: overrides.estimatedProfit ?? 400,
    },
    trend: [
      { date: '2026-02-28', revenue: overrides.totalRevenue ?? 1000 },
    ],
    topProducts: [
      {
        productName: topProduct,
        sku: 'SKU-1',
        unitsSold: 10,
        revenue: 500,
      },
    ],
    excludedCancelledOrders: 0,
  }
}

describe('detectInsightsFromSummaryChange', () => {
  it('creates revenue, orders, and top product insights for meaningful changes', () => {
    const previous = buildSummary(
      {
        totalRevenue: 1000,
        totalOrders: 40,
        averageOrderValue: 25,
        totalUnitsSold: 80,
        totalRefunded: 20,
      },
      'Classic Tee'
    )

    const current = buildSummary(
      {
        totalRevenue: 1300,
        totalOrders: 48,
        averageOrderValue: 27,
        totalUnitsSold: 90,
        totalRefunded: 40,
      },
      'Hoodie'
    )

    const insights = detectInsightsFromSummaryChange({ previous, current })

    expect(insights.some((item) => item.type === 'revenue_change')).toBe(true)
    expect(insights.some((item) => item.type === 'orders_change')).toBe(true)
    expect(insights.some((item) => item.type === 'top_product_changed')).toBe(true)
    expect(insights.some((item) => item.type === 'refunds_increased')).toBe(true)
  })

  it('returns no insights when no previous snapshot exists', () => {
    const current = buildSummary({})
    const insights = detectInsightsFromSummaryChange({ previous: null, current })
    expect(insights).toHaveLength(0)
  })
})
