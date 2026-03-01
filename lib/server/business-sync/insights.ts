import type { Prisma } from '@prisma/client'
import type { ShopifySummary } from '@/lib/types/shopify'

export type InsightDraft = {
  type: string
  title: string
  body: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  deltaJson?: Prisma.InputJsonValue
}

function percentDelta(current: number, previous: number): number {
  if (previous === 0) {
    if (current === 0) {
      return 0
    }

    return current > 0 ? 1 : -1
  }

  return (current - previous) / Math.abs(previous)
}

function toPercentLabel(value: number): string {
  return `${Math.abs(value * 100).toFixed(1)}%`
}

function toCurrencyLabel(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function toSeverityForDrop(deltaPct: number): 'INFO' | 'WARNING' | 'CRITICAL' {
  if (deltaPct <= -0.25) {
    return 'CRITICAL'
  }

  if (deltaPct <= -0.12) {
    return 'WARNING'
  }

  return 'INFO'
}

function toSeverityForIncrease(deltaPct: number): 'INFO' | 'WARNING' | 'CRITICAL' {
  if (deltaPct >= 0.35) {
    return 'CRITICAL'
  }

  if (deltaPct >= 0.2) {
    return 'WARNING'
  }

  return 'INFO'
}

export function detectInsightsFromSummaryChange(params: {
  previous: ShopifySummary | null
  current: ShopifySummary
}): InsightDraft[] {
  const { previous, current } = params
  if (!previous || !previous.hasData || !current.hasData) {
    return []
  }

  const drafts: InsightDraft[] = []

  const revenueDelta = current.totals.totalRevenue - previous.totals.totalRevenue
  const revenueDeltaPct = percentDelta(current.totals.totalRevenue, previous.totals.totalRevenue)
  if (Math.abs(revenueDeltaPct) >= 0.08 && Math.abs(revenueDelta) >= 20) {
    const up = revenueDelta > 0
    drafts.push({
      type: 'revenue_change',
      title: up ? 'Revenue increased' : 'Revenue decreased',
      body: `${up ? 'Up' : 'Down'} ${toPercentLabel(revenueDeltaPct)} vs last sync (${toCurrencyLabel(previous.totals.totalRevenue)} -> ${toCurrencyLabel(current.totals.totalRevenue)}).`,
      severity: up ? toSeverityForIncrease(revenueDeltaPct) : toSeverityForDrop(revenueDeltaPct),
      deltaJson: {
        previous: previous.totals.totalRevenue,
        current: current.totals.totalRevenue,
        delta: revenueDelta,
        deltaPct: revenueDeltaPct,
      },
    })
  }

  const orderDelta = current.totals.totalOrders - previous.totals.totalOrders
  const orderDeltaPct = percentDelta(current.totals.totalOrders, previous.totals.totalOrders)
  if (Math.abs(orderDeltaPct) >= 0.1 && Math.abs(orderDelta) >= 2) {
    const up = orderDelta > 0
    drafts.push({
      type: 'orders_change',
      title: up ? 'Orders spiked' : 'Orders dropped',
      body: `${up ? 'Up' : 'Down'} ${Math.abs(orderDelta)} orders (${toPercentLabel(orderDeltaPct)} vs last sync).`,
      severity: up ? toSeverityForIncrease(orderDeltaPct) : toSeverityForDrop(orderDeltaPct),
      deltaJson: {
        previous: previous.totals.totalOrders,
        current: current.totals.totalOrders,
        delta: orderDelta,
        deltaPct: orderDeltaPct,
      },
    })
  }

  const aovDelta = current.totals.averageOrderValue - previous.totals.averageOrderValue
  const aovDeltaPct = percentDelta(current.totals.averageOrderValue, previous.totals.averageOrderValue)
  if (Math.abs(aovDeltaPct) >= 0.08 && Math.abs(aovDelta) >= 3) {
    const up = aovDelta > 0
    drafts.push({
      type: 'aov_change',
      title: up ? 'AOV improved' : 'AOV declined',
      body: `${up ? 'Up' : 'Down'} ${toPercentLabel(aovDeltaPct)} (${toCurrencyLabel(previous.totals.averageOrderValue)} -> ${toCurrencyLabel(current.totals.averageOrderValue)}).`,
      severity: up ? 'INFO' : toSeverityForDrop(aovDeltaPct),
      deltaJson: {
        previous: previous.totals.averageOrderValue,
        current: current.totals.averageOrderValue,
        delta: aovDelta,
        deltaPct: aovDeltaPct,
      },
    })
  }

  const previousTopProduct = previous.topProducts[0]?.productName?.trim() ?? null
  const currentTopProduct = current.topProducts[0]?.productName?.trim() ?? null
  if (
    previousTopProduct &&
    currentTopProduct &&
    previousTopProduct.toLowerCase() !== currentTopProduct.toLowerCase()
  ) {
    drafts.push({
      type: 'top_product_changed',
      title: 'Top product changed',
      body: `${currentTopProduct} replaced ${previousTopProduct} as the top revenue product.`,
      severity: 'INFO',
      deltaJson: {
        previous: previousTopProduct,
        current: currentTopProduct,
      },
    })
  }

  const refundDelta = current.totals.totalRefunded - previous.totals.totalRefunded
  const refundDeltaPct = percentDelta(current.totals.totalRefunded, previous.totals.totalRefunded)
  if (refundDelta > 10 && refundDeltaPct >= 0.15) {
    drafts.push({
      type: 'refunds_increased',
      title: 'Refunds increased',
      body: `Refunded amount rose ${toPercentLabel(refundDeltaPct)} (${toCurrencyLabel(previous.totals.totalRefunded)} -> ${toCurrencyLabel(current.totals.totalRefunded)}).`,
      severity: toSeverityForIncrease(refundDeltaPct),
      deltaJson: {
        previous: previous.totals.totalRefunded,
        current: current.totals.totalRefunded,
        delta: refundDelta,
        deltaPct: refundDeltaPct,
      },
    })
  }

  return drafts
}
