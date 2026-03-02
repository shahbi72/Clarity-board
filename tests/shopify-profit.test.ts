import { describe, expect, it } from 'vitest'
import { buildDashboardInsightCards } from '@/lib/shopify/insights'
import { calculateProfitEstimate } from '@/lib/shopify/profit'
import type { ShopifySummary } from '@/lib/types/shopify'

describe('calculateProfitEstimate', () => {
  it('applies refunds, COGS, fees, and shipping in profit formula', () => {
    const result = calculateProfitEstimate({
      grossRevenue: 1000,
      refunded: 100,
      totalOrders: 20,
      totalUnitsSold: 50,
      feePercent: 2.9,
      fixedFeePerOrder: 0.3,
      avgShippingPerOrder: 4,
      productCosts: {
        'sku-a': 6,
      },
      products: [
        {
          key: 'sku-a',
          productName: 'SKU A',
          unitsSold: 30,
          revenue: 700,
        },
        {
          key: 'sku-b',
          productName: 'SKU B',
          unitsSold: 20,
          revenue: 300,
        },
      ],
    })

    expect(result.netRevenue).toBe(900)
    expect(result.totalFees).toBe(35)
    expect(result.totalShipping).toBe(80)
    expect(result.totalCogs).toBe(300)
    expect(result.estimatedProfit).toBe(485)
    expect(result.marginPct).toBeCloseTo(0.5388, 3)
  })
})

describe('buildDashboardInsightCards', () => {
  it('emits a high-severity margin insight when margin is below threshold', () => {
    const summary: ShopifySummary = {
      source: 'user',
      datasetName: 'Store',
      rangeDays: 30,
      includeCancelled: false,
      hasData: true,
      currency: 'USD',
      totals: {
        totalRevenue: 1200,
        totalOrders: 40,
        averageOrderValue: 30,
        totalUnitsSold: 85,
        totalRefunded: 10,
        estimatedProfit: 210,
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
          revenue: 600,
          orders: 20,
          unitsSold: 40,
          refunded: 40,
          averageOrderValue: 30,
          refundRate: 0.066,
          marginPct: 0.2,
        },
        previous: {
          from: '2026-02-16',
          to: '2026-02-22',
          revenue: 620,
          orders: 21,
          unitsSold: 41,
          refunded: 20,
          averageOrderValue: 29.52,
          refundRate: 0.032,
          marginPct: 0.31,
        },
        deltas: {
          revenuePct: -0.03,
          ordersPct: -0.04,
          averageOrderValuePct: 0.016,
          refundRateDelta: 0.034,
          refundRateRelative: 1.0625,
          marginDelta: -0.11,
        },
        topSkuDeclines: [],
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

    const insights = buildDashboardInsightCards({
      summary,
      profit: {
        marginPct: 0.2,
        previousMarginPct: 0.31,
        lowMarginProductCount: 2,
      },
    })

    expect(insights.some((item) => item.type === 'margin_drop')).toBe(true)
  })
})
