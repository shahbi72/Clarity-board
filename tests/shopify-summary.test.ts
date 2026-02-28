import { describe, expect, it } from 'vitest'
import { buildShopifySummary } from '@/lib/server/shopify-summary'

const rows = [
  {
    orderId: '1001',
    orderName: '#1001',
    createdDate: '2026-02-26',
    lineitemSku: 'TEE-1',
    productName: 'Classic Tee',
    quantity: 2,
    lineGrossUsd: 60,
    refundedAmountUsd: 0,
    estimatedLineCostUsd: 24,
    isCancelled: false,
  },
  {
    orderId: '1002',
    orderName: '#1002',
    createdDate: '2026-02-27',
    lineitemSku: 'CAP-1',
    productName: 'Cap',
    quantity: 1,
    lineGrossUsd: 40,
    refundedAmountUsd: 10,
    estimatedLineCostUsd: 12,
    isCancelled: false,
  },
  {
    orderId: '1003',
    orderName: '#1003',
    createdDate: '2026-02-28',
    lineitemSku: 'CAP-1',
    productName: 'Cap',
    quantity: 1,
    lineGrossUsd: 50,
    refundedAmountUsd: 0,
    estimatedLineCostUsd: 15,
    isCancelled: true,
  },
]

describe('buildShopifySummary', () => {
  it('calculates Shopify MVP metrics and excludes cancelled orders by default', () => {
    const summary = buildShopifySummary({
      rows,
      datasetName: 'Demo Store',
      rangeDays: 7,
      includeCancelled: false,
      source: 'demo',
    })

    expect(summary.totals.totalOrders).toBe(2)
    expect(summary.totals.totalRevenue).toBe(90)
    expect(summary.totals.averageOrderValue).toBe(45)
    expect(summary.totals.totalUnitsSold).toBe(3)
    expect(summary.totals.estimatedProfit).toBe(57)
    expect(summary.topProducts[0].productName).toBe('Classic Tee')
    expect(summary.excludedCancelledOrders).toBe(1)
  })

  it('includes cancelled orders when requested', () => {
    const summary = buildShopifySummary({
      rows,
      datasetName: 'Demo Store',
      rangeDays: 7,
      includeCancelled: true,
      source: 'demo',
    })

    expect(summary.totals.totalOrders).toBe(3)
    expect(summary.totals.totalRevenue).toBe(140)
    expect(summary.totals.totalUnitsSold).toBe(4)
    expect(summary.topProducts[0].productName).toBe('Cap')
  })
})
