import type { ShopifySummary } from '@/lib/types/shopify'

export type StoreHealthLabel = 'Excellent' | 'Good' | 'Watch' | 'Risk'

export type StoreHealthFactor = {
  id: 'revenue' | 'margin' | 'refunds' | 'concentration'
  label: string
  score: number
  maxScore: number
  reason: string
}

export type StoreHealthScore = {
  score: number
  label: StoreHealthLabel
  factors: StoreHealthFactor[]
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round(value: number): number {
  return Math.round(value)
}

function toPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function toLabel(score: number): StoreHealthLabel {
  if (score >= 85) {
    return 'Excellent'
  }
  if (score >= 70) {
    return 'Good'
  }
  if (score >= 50) {
    return 'Watch'
  }
  return 'Risk'
}

export function calculateStoreHealthScore(params: {
  summary: ShopifySummary
  marginPct?: number | null
}): StoreHealthScore {
  const { summary } = params
  const comparison = summary.comparison7d
  const effectiveMargin = params.marginPct ?? null

  const revenueScore = round(clamp(20 + comparison.deltas.revenuePct * 100, 0, 35))
  const revenueReason = `Revenue is ${comparison.deltas.revenuePct >= 0 ? 'up' : 'down'} ${toPercent(
    Math.abs(comparison.deltas.revenuePct)
  )} vs previous 7 days.`

  const marginScore =
    effectiveMargin == null ? 18 : round(clamp(effectiveMargin * 100, 0, 30))
  const marginReason =
    effectiveMargin == null
      ? 'Margin is neutral because COGS/fees inputs are not configured yet.'
      : `Estimated margin is ${toPercent(effectiveMargin)}.`

  const refundScore = round(
    clamp(
      20 -
        comparison.current.refundRate * 80 -
        Math.max(0, comparison.deltas.refundRateDelta) * 220,
      0,
      20
    )
  )
  const refundReason = `Refund rate is ${toPercent(
    comparison.current.refundRate
  )} (${comparison.deltas.refundRateDelta >= 0 ? '+' : ''}${toPercent(
    comparison.deltas.refundRateDelta
  )} delta).`

  const topSkuShare =
    summary.totals.totalRevenue > 0 && summary.topProducts[0]
      ? summary.topProducts[0].revenue / summary.totals.totalRevenue
      : 0
  const concentrationScore = round(clamp(15 - Math.max(0, (topSkuShare - 0.35) * 50), 0, 15))
  const concentrationReason =
    topSkuShare > 0
      ? `${summary.topProducts[0]?.productName ?? 'Top SKU'} contributes ${toPercent(
          topSkuShare
        )} of total revenue.`
      : 'No SKU concentration risk detected.'

  const factors: StoreHealthFactor[] = [
    {
      id: 'revenue',
      label: 'Revenue trend',
      score: revenueScore,
      maxScore: 35,
      reason: revenueReason,
    },
    {
      id: 'margin',
      label: 'Margin quality',
      score: marginScore,
      maxScore: 30,
      reason: marginReason,
    },
    {
      id: 'refunds',
      label: 'Refund stability',
      score: refundScore,
      maxScore: 20,
      reason: refundReason,
    },
    {
      id: 'concentration',
      label: 'SKU concentration risk',
      score: concentrationScore,
      maxScore: 15,
      reason: concentrationReason,
    },
  ]

  const total = factors.reduce((sum, factor) => sum + factor.score, 0)
  return {
    score: total,
    label: toLabel(total),
    factors: factors.sort((a, b) => a.score - b.score),
  }
}
