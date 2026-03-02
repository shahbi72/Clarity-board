import type { ShopifyCopilotContextPacket } from '@/lib/types/shopify'

const NUMBER_PATTERN = /(?:\$)?-?\d[\d,]*(?:\.\d+)?%?/g

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatSignedCurrency(value: number): string {
  return `${value >= 0 ? '+' : '-'}${formatCurrency(Math.abs(value))}`
}

function formatSignedPercent(value: number): string {
  const pct = Math.abs(value * 100).toFixed(1)
  return `${value >= 0 ? '+' : '-'}${pct}%`
}

function formatSignedCount(value: number): string {
  return `${value >= 0 ? '+' : ''}${Math.round(value)}`
}

function normalizeQuestion(question: string): string {
  return question.trim().toLowerCase()
}

function countNumericTokens(text: string): number {
  return text.match(NUMBER_PATTERN)?.length ?? 0
}

function topInsight(
  context: ShopifyCopilotContextPacket
): ShopifyCopilotContextPacket['insights'][number] | null {
  return context.insights[0] ?? null
}

function topDriver(context: ShopifyCopilotContextPacket): ShopifyCopilotContextPacket['topSkuDeclines'][number] | null {
  return context.topSkuDeclines[0] ?? null
}

function appendCoreNumbers(answer: string, context: ShopifyCopilotContextPacket): string {
  const fallback = ` Current revenue ${formatCurrency(
    context.comparison7d.current.revenue
  )} vs ${formatCurrency(context.comparison7d.previous.revenue)}. Orders ${
    context.comparison7d.current.orders
  } vs ${context.comparison7d.previous.orders}. AOV ${formatCurrency(
    context.comparison7d.current.averageOrderValue
  )}.`
  return `${answer}${fallback}`
}

function ensureResponseQuality(params: {
  answer: string
  question: string
  context: ShopifyCopilotContextPacket
}): string {
  let answer = params.answer.trim()
  const question = params.question
  const context = params.context
  const relevantForDriver = /(revenue|risky|risk|fix|profit|leak|product|sku)/.test(question)

  if (relevantForDriver) {
    const driver = topDriver(context)
    if (driver && !answer.toLowerCase().includes(driver.productName.toLowerCase())) {
      const shareText =
        driver.contributionShare != null
          ? ` and ${Math.round(driver.contributionShare * 100)}% contribution share`
          : ''
      answer += ` Primary SKU driver: ${driver.productName} moved ${formatSignedCurrency(
        driver.deltaValue
      )} (${formatSignedPercent(driver.deltaPct)})${shareText}.`
    }
  }

  if (
    /(profit|margin|leak)/.test(question) &&
    context.profit.marginPct == null &&
    !answer.toLowerCase().includes('cogs')
  ) {
    answer +=
      ' Profit detail is limited because COGS/fees are missing; add per-product COGS and shipping inputs in Profit Estimator for precise margin alerts.'
  }

  if (countNumericTokens(answer) < 3) {
    answer = appendCoreNumbers(answer, context)
  }

  return answer
}

function buildDefaultResponse(context: ShopifyCopilotContextPacket): string {
  const headline = topInsight(context)

  const lines = [
    `Revenue ${formatCurrency(context.comparison7d.current.revenue)} vs ${formatCurrency(
      context.comparison7d.previous.revenue
    )} (${formatSignedPercent(context.comparison7d.deltas.revenuePct)}, ${formatSignedCurrency(
      context.comparison7d.deltas.revenueDelta
    )}).`,
    `Orders ${context.comparison7d.current.orders} vs ${context.comparison7d.previous.orders} (${formatSignedPercent(
      context.comparison7d.deltas.ordersPct
    )}).`,
    `AOV ${formatCurrency(context.comparison7d.current.averageOrderValue)} vs ${formatCurrency(
      context.comparison7d.previous.averageOrderValue
    )} (${formatSignedPercent(context.comparison7d.deltas.averageOrderValuePct)}).`,
  ]

  if (context.profit.marginPct != null) {
    lines.push(
      `Estimated margin ${(context.profit.marginPct * 100).toFixed(1)}% with profit ${formatCurrency(
        context.profit.estimatedProfit ?? 0
      )}.`
    )
  }

  if (headline) {
    lines.push(`Top current insight: ${headline.title}.`)
  }

  return lines.join(' ')
}

export function generateShopifyCopilotAnswer(params: {
  question: string
  context: ShopifyCopilotContextPacket
}): string {
  const question = normalizeQuestion(params.question)
  const context = params.context
  const driver = topDriver(context)

  let answer: string

  if (question.includes('why') && question.includes('revenue')) {
    const parts = [
      `Revenue moved ${formatSignedPercent(context.comparison7d.deltas.revenuePct)} (${formatSignedCurrency(
        context.comparison7d.deltas.revenueDelta
      )}) vs the previous 7-day window.`,
      `Orders moved ${formatSignedPercent(
        context.comparison7d.deltas.ordersPct
      )} (${formatSignedCount(context.comparison7d.deltas.ordersDelta)}) and AOV moved ${formatSignedPercent(
        context.comparison7d.deltas.averageOrderValuePct
      )} (${formatSignedCurrency(context.comparison7d.deltas.averageOrderValueDelta)} per order).`,
    ]

    if (driver) {
      parts.push(
        `${driver.productName} moved ${formatSignedCurrency(driver.deltaValue)} (${formatSignedPercent(
          driver.deltaPct
        )})${driver.contributionShare != null ? ` and explains ${(driver.contributionShare * 100).toFixed(1)}% of the total move` : ''}.`
      )
    }

    if (context.comparison7d.deltas.refundRateDelta > 0) {
      parts.push(
        `Refund rate increased by ${formatSignedPercent(
          context.comparison7d.deltas.refundRateDelta
        )} with refunded dollars ${formatSignedCurrency(context.comparison7d.deltas.refundedDelta)}.`
      )
    }

    parts.push(
      'Suggested action: verify the main SKU page conversion and traffic source quality before increasing spend.'
    )
    answer = parts.join(' ')
  } else if (question.includes('risky') || question.includes('risk')) {
    const lowMargin = context.profit.lowMarginProducts[0] ?? null
    if (lowMargin) {
      answer = `${lowMargin.productName} is your highest risk SKU with ${(lowMargin.marginPct * 100).toFixed(
        1
      )}% margin. Revenue delta is ${formatSignedCurrency(
        context.comparison7d.deltas.revenueDelta
      )}, refund delta is ${formatSignedCurrency(
        context.comparison7d.deltas.refundedDelta
      )}, and order delta is ${formatSignedCount(
        context.comparison7d.deltas.ordersDelta
      )}. Suggested action: raise price or reduce discount depth for that SKU first.`
    } else if (driver) {
      answer = `${driver.productName} is currently the riskiest driver with ${formatSignedPercent(
        driver.deltaPct
      )} revenue movement (${formatSignedCurrency(driver.deltaValue)}). Store-level revenue is ${formatSignedCurrency(
        context.comparison7d.deltas.revenueDelta
      )}, orders ${formatSignedCount(context.comparison7d.deltas.ordersDelta)}, AOV ${formatSignedCurrency(
        context.comparison7d.deltas.averageOrderValueDelta
      )}. Suggested action: audit stock, PDP conversion, and ad allocation for this SKU.`
    } else {
      answer =
        'No single SKU dominates risk yet. Revenue, order, and AOV movement are broadly distributed; prioritize conversion and refund diagnostics.'
    }
  } else if (question.includes('fix first') || question.includes('what should i fix')) {
    const actions: string[] = []

    if (context.comparison7d.deltas.revenuePct <= -0.1) {
      actions.push(
        `1) Revenue recovery: ${formatSignedPercent(context.comparison7d.deltas.revenuePct)} (${formatSignedCurrency(
          context.comparison7d.deltas.revenueDelta
        )}).`
      )
    }
    if (context.comparison7d.deltas.ordersPct <= -0.1) {
      actions.push(
        `2) Order volume: ${formatSignedPercent(context.comparison7d.deltas.ordersPct)} (${formatSignedCount(
          context.comparison7d.deltas.ordersDelta
        )}).`
      )
    }
    if (context.comparison7d.deltas.refundRateDelta >= 0.03) {
      actions.push(
        `3) Refund pressure: ${formatSignedPercent(
          context.comparison7d.deltas.refundRateDelta
        )} (${formatSignedCurrency(context.comparison7d.deltas.refundedDelta)}).`
      )
    }
    if (context.profit.marginPct != null && context.profit.marginPct < 0.25) {
      actions.push(`4) Margin: ${(context.profit.marginPct * 100).toFixed(1)}%, below 25% target.`)
    }

    if (actions.length === 0) {
      actions.push(
        `1) Store is stable: revenue ${formatSignedCurrency(
          context.comparison7d.deltas.revenueDelta
        )}, orders ${formatSignedCount(context.comparison7d.deltas.ordersDelta)}, AOV ${formatSignedCurrency(
          context.comparison7d.deltas.averageOrderValueDelta
        )}.`
      )
    }

    answer = `${actions.slice(0, 3).join(' ')} Suggested action: start with the first line item today.`
  } else if (question.includes('profit leak') || question.includes('margin')) {
    const parts: string[] = [
      `Refunded dollars changed by ${formatSignedCurrency(context.comparison7d.deltas.refundedDelta)} and refund rate moved ${formatSignedPercent(
        context.comparison7d.deltas.refundRateDelta
      )}.`,
      `Revenue delta is ${formatSignedCurrency(context.comparison7d.deltas.revenueDelta)} on ${formatSignedCount(
        context.comparison7d.deltas.ordersDelta
      )} orders.`,
    ]

    if (context.profit.marginPct != null) {
      parts.push(
        `Estimated margin is ${(context.profit.marginPct * 100).toFixed(1)}% with estimated profit ${formatCurrency(
          context.profit.estimatedProfit ?? 0
        )}.`
      )
    } else {
      parts.push(
        'Margin precision is currently limited because COGS/fees are not fully configured in Profit Estimator.'
      )
    }

    if (context.profit.lowMarginProducts.length > 0) {
      const names = context.profit.lowMarginProducts
        .slice(0, 2)
        .map((item) => `${item.productName} (${(item.marginPct * 100).toFixed(1)}%)`)
        .join(', ')
      parts.push(`Lowest-margin products: ${names}.`)
    }

    parts.push('Suggested action: update COGS inputs and tighten discounts on low-margin SKUs.')
    answer = parts.join(' ')
  } else {
    answer = buildDefaultResponse(context)
  }

  return ensureResponseQuality({
    answer,
    question,
    context,
  })
}
