import type { ShopifySummary } from '@/lib/types/shopify'

export type DashboardInsightSeverity = 'HIGH' | 'MED' | 'INFO'

export type DashboardInsightCard = {
  type: string
  title: string
  body: string
  severity: DashboardInsightSeverity
  score: number
}

type ProfitSignalInput = {
  marginPct: number | null
  previousMarginPct: number | null
  lowMarginProductCount: number
}

function toSeverityScore(severity: DashboardInsightSeverity): number {
  switch (severity) {
    case 'HIGH':
      return 300
    case 'MED':
      return 200
    case 'INFO':
      return 100
  }
}

function toSignedPercent(value: number): string {
  const valuePct = Math.abs(value * 100).toFixed(1)
  return `${value >= 0 ? '+' : '-'}${valuePct}%`
}

function toAbsolutePercent(value: number): string {
  return `${Math.abs(value * 100).toFixed(1)}%`
}

function toSignedCurrency(value: number): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Math.abs(value))
  return `${value >= 0 ? '+' : '-'}${formatted}`
}

function toCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function pushInsight(
  list: DashboardInsightCard[],
  insight: Omit<DashboardInsightCard, 'score'> & { impact: number }
): void {
  list.push({
    ...insight,
    score: toSeverityScore(insight.severity) + Math.round(insight.impact * 100),
  })
}

export function buildDashboardInsightCards(params: {
  summary: ShopifySummary
  profit?: ProfitSignalInput
}): DashboardInsightCard[] {
  const { summary, profit } = params
  const comparison = summary.comparison7d
  const cards: DashboardInsightCard[] = []

  const primarySku = comparison.topSkuDeclines[0] ?? null
  const revenueDeltaValue = round2(comparison.current.revenue - comparison.previous.revenue)

  const revenueDeltaPct = comparison.deltas.revenuePct
  if (Math.abs(revenueDeltaPct) >= 0.1) {
    const up = revenueDeltaPct > 0
    const driverText = primarySku
      ? `Primary driver: ${primarySku.productName} (${toSignedCurrency(primarySku.deltaValue)}${primarySku.contributionShare != null ? `, ${(primarySku.contributionShare * 100).toFixed(1)}% share` : ''}).`
      : 'Primary driver: broad order volume shift.'
    const action = up
      ? 'Suggested action: scale channels that lifted revenue and protect margin.'
      : 'Suggested action: review main driver SKU page, traffic quality, and refunds.'

    pushInsight(cards, {
      type: 'revenue_change',
      title: `Revenue ${up ? 'up' : 'down'} ${toAbsolutePercent(revenueDeltaPct)} (${toSignedCurrency(revenueDeltaValue)})`,
      body: [driverText, `Orders ${toSignedPercent(comparison.deltas.ordersPct)} and AOV ${toSignedPercent(comparison.deltas.averageOrderValuePct)}.`, action].join('\n'),
      severity: up ? 'INFO' : 'HIGH',
      impact: Math.abs(revenueDeltaPct),
    })
  }

  const ordersDeltaPct = comparison.deltas.ordersPct
  const ordersDelta = comparison.current.orders - comparison.previous.orders
  if (Math.abs(ordersDeltaPct) >= 0.1) {
    const up = ordersDeltaPct > 0
    const action = up
      ? 'Suggested action: keep the high-performing acquisition mix and monitor conversion.'
      : 'Suggested action: inspect checkout conversion and channel traffic drops.'
    pushInsight(cards, {
      type: 'orders_change',
      title: `Orders ${up ? 'up' : 'down'} ${toAbsolutePercent(ordersDeltaPct)} (${ordersDelta >= 0 ? '+' : ''}${ordersDelta}, ${toSignedCurrency(revenueDeltaValue)} impact)`,
      body: [
        primarySku ? `Primary driver: ${primarySku.productName}.` : 'Primary driver: traffic/conversion shift.',
        `Revenue moved ${toSignedCurrency(revenueDeltaValue)} while AOV moved ${toSignedPercent(comparison.deltas.averageOrderValuePct)}.`,
        action,
      ].join('\n'),
      severity: up ? 'INFO' : 'HIGH',
      impact: Math.abs(ordersDeltaPct),
    })
  }

  const aovDeltaPct = comparison.deltas.averageOrderValuePct
  if (Math.abs(aovDeltaPct) >= 0.07) {
    const up = aovDeltaPct > 0
    const deltaAov = round2(comparison.current.averageOrderValue - comparison.previous.averageOrderValue)
    const impactUsd = round2(deltaAov * comparison.current.orders)
    const action = up
      ? 'Suggested action: replicate bundle and upsell placements that lifted basket size.'
      : 'Suggested action: reduce discount leakage and strengthen upsell placement.'
    pushInsight(cards, {
      type: 'aov_change',
      title: `AOV ${up ? 'up' : 'down'} ${toAbsolutePercent(aovDeltaPct)} (${toSignedCurrency(deltaAov)}/order, ${toSignedCurrency(impactUsd)} impact)`,
      body: [
        'Primary driver: pricing/discount mix and product composition.',
        `AOV moved ${toSignedCurrency(deltaAov)} per order.`,
        action,
      ].join('\n'),
      severity: up ? 'INFO' : 'MED',
      impact: Math.abs(aovDeltaPct),
    })
  }

  if (
    comparison.deltas.refundRateDelta >= 0.03 ||
    (comparison.deltas.refundRateRelative != null && comparison.deltas.refundRateRelative >= 0.5)
  ) {
    const refundDeltaUsd = round2(comparison.current.refunded - comparison.previous.refunded)
    pushInsight(cards, {
      type: 'refund_spike',
      title: `Refund rate up ${toAbsolutePercent(comparison.deltas.refundRateDelta)} (${toSignedCurrency(refundDeltaUsd)})`,
      body: [
        `Primary driver: refund pressure increased from ${(comparison.previous.refundRate * 100).toFixed(1)}% to ${(comparison.current.refundRate * 100).toFixed(1)}%.`,
        'Orders and AOV alone do not explain this movement.',
        'Suggested action: audit return reasons by SKU and fix top defect/expectation gaps.',
      ].join('\n'),
      severity: 'HIGH',
      impact: comparison.deltas.refundRateDelta,
    })
  }

  for (const decline of comparison.topSkuDeclines.slice(0, 2)) {
    pushInsight(cards, {
      type: `top_sku_decline_${decline.sku ?? decline.productName}`,
      title: `${decline.productName} down ${toAbsolutePercent(decline.deltaPct)} (${toSignedCurrency(decline.deltaValue)})`,
      body: [
        `Primary driver: SKU decline${decline.contributionShare != null ? ` with ${(decline.contributionShare * 100).toFixed(1)}% contribution` : ''}.`,
        `Revenue moved ${toSignedCurrency(decline.deltaValue)} (${toCurrency(decline.previousRevenue)} -> ${toCurrency(decline.currentRevenue)}).`,
        'Suggested action: check stock availability, product page conversion, and channel allocation.',
      ].join('\n'),
      severity: 'HIGH',
      impact: Math.abs(decline.deltaPct),
    })
  }

  if (profit && profit.marginPct != null) {
    const marginDrop =
      profit.previousMarginPct != null ? profit.marginPct - profit.previousMarginPct : null

    if (profit.marginPct < 0.25 || (marginDrop != null && marginDrop <= -0.08)) {
      pushInsight(cards, {
        type: 'margin_drop',
        title: `Margin ${(profit.marginPct * 100).toFixed(1)}% (${toSignedPercent(marginDrop ?? 0)})`,
        body: [
          `Primary driver: margin compression${profit.lowMarginProductCount > 0 ? ` across ${profit.lowMarginProductCount} low-margin products` : ''}.`,
          `Profit sensitivity increased with current margin ${(profit.marginPct * 100).toFixed(1)}%.`,
          'Suggested action: update COGS and fees, then reprice low-margin SKUs.',
        ].join('\n'),
        severity: 'HIGH',
        impact: Math.abs(marginDrop ?? profit.marginPct - 0.25),
      })
    }
  }

  return cards.sort((a, b) => b.score - a.score).slice(0, 6)
}
