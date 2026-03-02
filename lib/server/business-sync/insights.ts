import type { Prisma } from '@prisma/client'
import type { ShopifySummary, ShopifyTopSkuDecline } from '@/lib/types/shopify'

export type InsightDraft = {
  type: string
  periodKey: string
  title: string
  body: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  deltaJson?: Prisma.InputJsonValue
}

type PrimaryDriver = {
  type: 'sku' | 'orders' | 'aov' | 'refunds' | 'margin'
  label: string
  deltaValue: number | null
  contributionShare: number | null
}

function toSignedPercent(value: number): string {
  const pct = Math.abs(value * 100).toFixed(1)
  return `${value >= 0 ? '+' : '-'}${pct}%`
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

function toPeriodKey(summary: ShopifySummary): string {
  return `${summary.comparison7d.current.from}:${summary.comparison7d.current.to}`
}

function toTopSkuTypeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function pickPrimarySkuDecline(current: ShopifySummary): ShopifyTopSkuDecline | null {
  return current.comparison7d.topSkuDeclines[0] ?? null
}

function formatDriverLine(driver: PrimaryDriver): string {
  if (driver.type === 'sku') {
    const shareText =
      driver.contributionShare != null
        ? ` (${(driver.contributionShare * 100).toFixed(1)}% of the total change)`
        : ''
    const deltaText = driver.deltaValue != null ? ` ${toSignedCurrency(driver.deltaValue)}` : ''
    return `Primary driver: SKU "${driver.label}"${deltaText}${shareText}.`
  }

  if (driver.type === 'orders') {
    return `Primary driver: order volume shift (${driver.label}).`
  }

  if (driver.type === 'aov') {
    return `Primary driver: basket size / pricing mix (${driver.label}).`
  }

  if (driver.type === 'refunds') {
    return `Primary driver: refund pressure (${driver.label}).`
  }

  return `Primary driver: margin compression (${driver.label}).`
}

function buildRevenueDriver(current: ShopifySummary): PrimaryDriver {
  const sku = pickPrimarySkuDecline(current)
  if (sku) {
    return {
      type: 'sku',
      label: sku.productName,
      deltaValue: sku.deltaValue,
      contributionShare: sku.contributionShare,
    }
  }

  return {
    type: 'orders',
    label: 'no single SKU outlier; shift appears broad-based',
    deltaValue: current.comparison7d.current.revenue - current.comparison7d.previous.revenue,
    contributionShare: null,
  }
}

function buildOrdersDriver(current: ShopifySummary): PrimaryDriver {
  const sku = pickPrimarySkuDecline(current)
  if (sku) {
    return {
      type: 'sku',
      label: sku.productName,
      deltaValue: sku.deltaValue,
      contributionShare: sku.contributionShare,
    }
  }

  return {
    type: 'orders',
    label: 'session-to-order conversion / channel traffic',
    deltaValue: null,
    contributionShare: null,
  }
}

function buildAovDriver(current: ShopifySummary): PrimaryDriver {
  return {
    type: 'aov',
    label: 'product mix, discounting, and cart composition',
    deltaValue:
      current.comparison7d.current.averageOrderValue -
      current.comparison7d.previous.averageOrderValue,
    contributionShare: null,
  }
}

function buildRefundDriver(current: ShopifySummary): PrimaryDriver {
  return {
    type: 'refunds',
    label: `refunded dollars ${toSignedCurrency(
      current.comparison7d.current.refunded - current.comparison7d.previous.refunded
    )}`,
    deltaValue: current.comparison7d.current.refunded - current.comparison7d.previous.refunded,
    contributionShare: null,
  }
}

function buildMarginDriver(current: ShopifySummary): PrimaryDriver {
  const margin = current.comparison7d.current.marginPct
  return {
    type: 'margin',
    label:
      margin != null
        ? `estimated margin at ${(margin * 100).toFixed(1)}%`
        : 'margin data unavailable without COGS inputs',
    deltaValue: null,
    contributionShare: null,
  }
}

export function detectInsightsFromSummaryChange(params: {
  previous: ShopifySummary | null
  current: ShopifySummary
}): InsightDraft[] {
  const { current } = params
  if (!current.hasData) {
    return []
  }

  const comparison = current.comparison7d
  const periodKey = toPeriodKey(current)
  const drafts: InsightDraft[] = []

  const revenueDeltaPct = comparison.deltas.revenuePct
  const revenueDeltaValue = round2(comparison.current.revenue - comparison.previous.revenue)
  const revenueDriver = buildRevenueDriver(current)

  if (Math.abs(revenueDeltaPct) >= 0.1) {
    const up = revenueDeltaPct > 0
    const action = up
      ? 'Suggested action: scale the winning channel or SKU while watching margin and refund rate.'
      : 'Suggested action: review traffic source + product page for the main driver SKU and audit recent refunds.'

    drafts.push({
      type: up ? 'revenue_up_7d' : 'revenue_drop_7d',
      periodKey,
      title: `Revenue ${up ? 'up' : 'down'} ${toAbsolutePercent(revenueDeltaPct)} (${toSignedCurrency(revenueDeltaValue)}) vs last 7 days`,
      body: [
        formatDriverLine(revenueDriver),
        `Orders ${toSignedPercent(comparison.deltas.ordersPct)} (${comparison.previous.orders} -> ${comparison.current.orders}), AOV ${toSignedPercent(comparison.deltas.averageOrderValuePct)} (${toCurrency(comparison.previous.averageOrderValue)} -> ${toCurrency(comparison.current.averageOrderValue)}).`,
        action,
      ].join('\n'),
      severity: up ? 'INFO' : 'CRITICAL',
      deltaJson: {
        metric: 'revenue',
        direction: up ? 'up' : 'down',
        previous: comparison.previous.revenue,
        current: comparison.current.revenue,
        deltaValue: revenueDeltaValue,
        deltaPct: revenueDeltaPct,
        absoluteImpact: Math.abs(revenueDeltaValue),
        primaryDriver: revenueDriver,
        action,
        ordersDelta: comparison.current.orders - comparison.previous.orders,
        ordersDeltaPct: comparison.deltas.ordersPct,
        aovDelta: round2(comparison.current.averageOrderValue - comparison.previous.averageOrderValue),
        aovDeltaPct: comparison.deltas.averageOrderValuePct,
      },
    })
  }

  const orderDeltaPct = comparison.deltas.ordersPct
  const orderDeltaValue = comparison.current.orders - comparison.previous.orders
  const ordersDriver = buildOrdersDriver(current)
  const ordersRevenueImpact = revenueDeltaValue

  if (Math.abs(orderDeltaPct) >= 0.1) {
    const up = orderDeltaPct > 0
    const action = up
      ? 'Suggested action: keep the acquisition mix that lifted order volume and protect conversion on top landing pages.'
      : 'Suggested action: inspect channel-level sessions and checkout conversion to recover lost orders.'

    drafts.push({
      type: up ? 'orders_up_7d' : 'orders_drop_7d',
      periodKey,
      title: `Orders ${up ? 'up' : 'down'} ${toAbsolutePercent(orderDeltaPct)} (${orderDeltaValue >= 0 ? '+' : ''}${orderDeltaValue} orders, ${toSignedCurrency(ordersRevenueImpact)} impact)`,
      body: [
        formatDriverLine(ordersDriver),
        `Revenue moved ${toSignedCurrency(ordersRevenueImpact)} and AOV moved ${toSignedPercent(comparison.deltas.averageOrderValuePct)}.`,
        action,
      ].join('\n'),
      severity: up ? 'INFO' : 'CRITICAL',
      deltaJson: {
        metric: 'orders',
        direction: up ? 'up' : 'down',
        previous: comparison.previous.orders,
        current: comparison.current.orders,
        deltaValue: orderDeltaValue,
        deltaPct: orderDeltaPct,
        absoluteImpact: Math.abs(orderDeltaValue),
        impactUsd: ordersRevenueImpact,
        primaryDriver: ordersDriver,
        action,
      },
    })
  }

  const aovDeltaPct = comparison.deltas.averageOrderValuePct
  const aovDeltaValue = round2(
    comparison.current.averageOrderValue - comparison.previous.averageOrderValue
  )
  const aovRevenueImpact = round2(aovDeltaValue * comparison.current.orders)
  const aovDriver = buildAovDriver(current)

  if (Math.abs(aovDeltaPct) >= 0.07) {
    const up = aovDeltaPct > 0
    const action = up
      ? 'Suggested action: repeat the bundle/upsell mix that improved basket size.'
      : 'Suggested action: review discount depth, bundle placement, and upsell acceptance on checkout paths.'

    drafts.push({
      type: up ? 'aov_up_7d' : 'aov_drop_7d',
      periodKey,
      title: `AOV ${up ? 'up' : 'down'} ${toAbsolutePercent(aovDeltaPct)} (${toSignedCurrency(aovDeltaValue)} per order, ${toSignedCurrency(aovRevenueImpact)} impact)`,
      body: [
        formatDriverLine(aovDriver),
        `AOV moved ${toCurrency(comparison.previous.averageOrderValue)} -> ${toCurrency(comparison.current.averageOrderValue)} across ${comparison.current.orders} orders.`,
        action,
      ].join('\n'),
      severity: up ? 'INFO' : 'WARNING',
      deltaJson: {
        metric: 'aov',
        direction: up ? 'up' : 'down',
        previous: comparison.previous.averageOrderValue,
        current: comparison.current.averageOrderValue,
        deltaValue: aovDeltaValue,
        deltaPct: aovDeltaPct,
        absoluteImpact: Math.abs(aovRevenueImpact),
        impactUsd: aovRevenueImpact,
        primaryDriver: aovDriver,
        action,
      },
    })
  }

  if (
    comparison.deltas.refundRateDelta >= 0.03 ||
    (comparison.deltas.refundRateRelative != null && comparison.deltas.refundRateRelative >= 0.5)
  ) {
    const refundDeltaUsd = round2(comparison.current.refunded - comparison.previous.refunded)
    const refundDriver = buildRefundDriver(current)
    const action =
      'Suggested action: audit refund reasons by SKU, check fulfillment quality, and patch top return causes this week.'

    drafts.push({
      type: 'refund_rate_spike_7d',
      periodKey,
      title: `Refund rate up ${toAbsolutePercent(comparison.deltas.refundRateDelta)} (${toSignedCurrency(refundDeltaUsd)} refunded)`,
      body: [
        formatDriverLine(refundDriver),
        `Refund rate moved ${(comparison.previous.refundRate * 100).toFixed(1)}% -> ${(comparison.current.refundRate * 100).toFixed(1)}%.`,
        action,
      ].join('\n'),
      severity: 'CRITICAL',
      deltaJson: {
        metric: 'refund_rate',
        direction: 'up',
        previous: comparison.previous.refundRate,
        current: comparison.current.refundRate,
        deltaValue: comparison.deltas.refundRateDelta,
        deltaPct: comparison.deltas.refundRateRelative,
        absoluteImpact: Math.abs(refundDeltaUsd),
        impactUsd: refundDeltaUsd,
        primaryDriver: refundDriver,
        action,
      },
    })
  }

  for (const decline of comparison.topSkuDeclines.slice(0, 3)) {
    const key = toTopSkuTypeKey(decline.sku ?? decline.productName)
    const action =
      'Suggested action: review stock status, price changes, and product page conversion for this SKU.'
    const shareLabel =
      decline.contributionShare != null
        ? `${(decline.contributionShare * 100).toFixed(1)}% of total revenue movement`
        : 'material share of revenue movement'
    const driver: PrimaryDriver = {
      type: 'sku',
      label: decline.productName,
      deltaValue: decline.deltaValue,
      contributionShare: decline.contributionShare,
    }

    drafts.push({
      type: `top_sku_decline_7d_${key}`,
      periodKey,
      title: `${decline.productName} revenue down ${toAbsolutePercent(decline.deltaPct)} (${toSignedCurrency(decline.deltaValue)})`,
      body: [
        formatDriverLine(driver),
        `This SKU explains ${shareLabel}. Previous ${toCurrency(decline.previousRevenue)} -> current ${toCurrency(decline.currentRevenue)}.`,
        action,
      ].join('\n'),
      severity: 'CRITICAL',
      deltaJson: {
        metric: 'sku_revenue',
        direction: 'down',
        previous: decline.previousRevenue,
        current: decline.currentRevenue,
        deltaValue: decline.deltaValue,
        deltaPct: decline.deltaPct,
        absoluteImpact: Math.abs(decline.deltaValue),
        primaryDriver: driver,
        contributionShare: decline.contributionShare,
        action,
      },
    })
  }

  const currentMargin = comparison.current.marginPct
  const marginDelta = comparison.deltas.marginDelta
  if (
    (currentMargin != null && currentMargin < 0.25) ||
    (marginDelta != null && marginDelta <= -0.08)
  ) {
    const currentProfitEstimate = currentMargin != null ? currentMargin * comparison.current.revenue : null
    const previousProfitEstimate =
      comparison.previous.marginPct != null
        ? comparison.previous.marginPct * comparison.previous.revenue
        : null
    const profitImpact =
      currentProfitEstimate != null && previousProfitEstimate != null
        ? round2(currentProfitEstimate - previousProfitEstimate)
        : null
    const marginDriver = buildMarginDriver(current)
    const action =
      'Suggested action: enter/update COGS and fees, then raise prices or reduce discounts on low-margin SKUs.'

    drafts.push({
      type: 'margin_drop_7d',
      periodKey,
      title:
        currentMargin != null
          ? `Margin ${(currentMargin * 100).toFixed(1)}% (${toSignedPercent(marginDelta ?? 0)} vs prior window${profitImpact != null ? `, ${toSignedCurrency(profitImpact)} est. profit impact` : ''})`
          : 'Margin pressure detected in latest 7-day window',
      body: [
        formatDriverLine(marginDriver),
        currentMargin != null && comparison.previous.marginPct != null
          ? `Margin moved ${(comparison.previous.marginPct * 100).toFixed(1)}% -> ${(currentMargin * 100).toFixed(1)}%.`
          : 'Margin baseline is incomplete. Add COGS/fees for stronger tracking.',
        action,
      ].join('\n'),
      severity: 'CRITICAL',
      deltaJson: {
        metric: 'margin',
        direction: 'down',
        previous: comparison.previous.marginPct,
        current: currentMargin,
        deltaValue: marginDelta,
        deltaPct: marginDelta,
        absoluteImpact: profitImpact != null ? Math.abs(profitImpact) : null,
        impactUsd: profitImpact,
        primaryDriver: marginDriver,
        action,
      },
    })
  }

  return drafts
}
