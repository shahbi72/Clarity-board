import { describe, expect, it } from 'vitest'
import { buildShopifySummary } from '@/lib/server/shopify-summary'

const rows = [
  {
    orderId: '1001',
    orderName: '#1001',
    createdAt: '2026-02-26T19:15:00.000Z',
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
    createdAt: '2026-02-27T19:45:00.000Z',
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
    createdAt: '2026-02-28T09:00:00.000Z',
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
    expect(summary.deadStock.items).toHaveLength(0)
    expect(summary.salesTiming.bestDay).toBe('Thursday')
    expect(summary.salesTiming.bestHour).toBe('7PM')
    expect(summary.comparison7d.windowDays).toBe(7)
    expect(summary.comparison7d.current.orders).toBe(2)
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
    expect(summary.deadStock.items).toHaveLength(0)
    expect(summary.salesTiming.ordersByDay.some((item) => item.day === 'Saturday' && item.orders === 1)).toBe(true)
    expect(summary.comparison7d.current.orders).toBe(3)
  })

  it('calculates top SKU contribution share for period-over-period decline', () => {
    const summary = buildShopifySummary({
      rows: [
        {
          orderId: '2001',
          orderName: '#2001',
          createdAt: '2026-02-18T10:00:00.000Z',
          createdDate: '2026-02-18',
          lineitemSku: 'HOODIE-1',
          productName: 'Black Hoodie',
          quantity: 5,
          lineGrossUsd: 500,
          refundedAmountUsd: 0,
          estimatedLineCostUsd: 200,
          isCancelled: false,
        },
        {
          orderId: '2002',
          orderName: '#2002',
          createdAt: '2026-02-25T10:00:00.000Z',
          createdDate: '2026-02-25',
          lineitemSku: 'HOODIE-1',
          productName: 'Black Hoodie',
          quantity: 3,
          lineGrossUsd: 300,
          refundedAmountUsd: 0,
          estimatedLineCostUsd: 120,
          isCancelled: false,
        },
      ],
      datasetName: 'Driver Store',
      rangeDays: 30,
      includeCancelled: false,
      source: 'demo',
    })

    expect(summary.comparison7d.topSkuDeclines).toHaveLength(1)
    const driver = summary.comparison7d.topSkuDeclines[0]
    expect(driver.productName).toBe('Black Hoodie')
    expect(driver.deltaValue).toBe(-200)
    expect(driver.contributionShare).toBe(1)
  })
})
