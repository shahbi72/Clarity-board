import { describe, expect, it } from 'vitest'
import { generateShopifyCopilotAnswer } from '@/lib/server/shopify-copilot'
import type { ShopifyCopilotContextPacket } from '@/lib/types/shopify'

const NUMBER_PATTERN = /(?:\$)?-?\d[\d,]*(?:\.\d+)?%?/g

function numericTokenCount(value: string): number {
  return value.match(NUMBER_PATTERN)?.length ?? 0
}

function buildContext(overrides?: Partial<ShopifyCopilotContextPacket>): ShopifyCopilotContextPacket {
  return {
    comparison7d: {
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
        revenueDelta: -200,
        ordersDelta: -10,
        averageOrderValueDelta: -1.83,
        unitsSoldDelta: -15,
        refundedDelta: 30,
      },
    },
    kpis: {
      totalRevenue: 1200,
      totalOrders: 48,
      averageOrderValue: 25,
      totalUnitsSold: 90,
      totalRefunded: 45,
    },
    topProducts: [
      {
        productName: 'Black Hoodie',
        sku: 'HOODIE-BLK',
        unitsSold: 32,
        revenue: 620,
      },
    ],
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
    profit: {
      estimatedProfit: 220,
      marginPct: 0.22,
      lowMarginProducts: [
        {
          productName: 'Black Hoodie',
          marginPct: 0.19,
        },
      ],
    },
    insights: [
      {
        type: 'revenue_drop_7d',
        title: 'Revenue down 19.6% (-$200.00) vs last 7 days',
        body: 'Primary driver: SKU "Black Hoodie".\nSuggested action: check conversion and returns.',
        severity: 'CRITICAL',
        deltaJson: {
          deltaPct: -0.1961,
          deltaValue: -200,
        },
      },
    ],
    ...overrides,
  }
}

describe('generateShopifyCopilotAnswer', () => {
  it('includes at least three concrete numbers in revenue explanation', () => {
    const answer = generateShopifyCopilotAnswer({
      question: 'Why did revenue change?',
      context: buildContext(),
    })

    expect(answer).toContain('Black Hoodie')
    expect(numericTokenCount(answer)).toBeGreaterThanOrEqual(3)
  })

  it('includes at least three numbers in risk response', () => {
    const answer = generateShopifyCopilotAnswer({
      question: 'Which product is risky?',
      context: buildContext(),
    })

    expect(answer).toContain('Black Hoodie')
    expect(numericTokenCount(answer)).toBeGreaterThanOrEqual(3)
  })

  it('explicitly calls out missing COGS input for profit questions', () => {
    const answer = generateShopifyCopilotAnswer({
      question: 'Any profit leaks?',
      context: buildContext({
        profit: {
          estimatedProfit: null,
          marginPct: null,
          lowMarginProducts: [],
        },
      }),
    })

    expect(answer.toLowerCase()).toContain('cogs')
    expect(numericTokenCount(answer)).toBeGreaterThanOrEqual(3)
  })
})
