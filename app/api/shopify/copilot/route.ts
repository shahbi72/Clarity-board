import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ensureCurrentUser, getCurrentUserId } from '@/lib/server/auth'
import { getErrorMessage, HttpError } from '@/lib/server/http-error'
import { generateShopifyCopilotAnswer } from '@/lib/server/shopify-copilot'
import {
  consumeShopifyCopilotAllowanceForUser,
  ensureShopifyTrialForUser,
} from '@/lib/server/subscriptions'
import type { ShopifyCopilotResponse } from '@/lib/types/shopify'

const ContextSchema = z.object({
  comparison7d: z.object({
    current: z.object({
      from: z.string(),
      to: z.string(),
      revenue: z.number(),
      orders: z.number(),
      unitsSold: z.number(),
      refunded: z.number(),
      averageOrderValue: z.number(),
      refundRate: z.number(),
      marginPct: z.number().nullable(),
    }),
    previous: z.object({
      from: z.string(),
      to: z.string(),
      revenue: z.number(),
      orders: z.number(),
      unitsSold: z.number(),
      refunded: z.number(),
      averageOrderValue: z.number(),
      refundRate: z.number(),
      marginPct: z.number().nullable(),
    }),
    deltas: z.object({
      revenuePct: z.number(),
      ordersPct: z.number(),
      averageOrderValuePct: z.number(),
      refundRateDelta: z.number(),
      refundRateRelative: z.number().nullable(),
      marginDelta: z.number().nullable(),
      revenueDelta: z.number(),
      ordersDelta: z.number(),
      averageOrderValueDelta: z.number(),
      unitsSoldDelta: z.number(),
      refundedDelta: z.number(),
    }),
  }),
  kpis: z.object({
    totalRevenue: z.number(),
    totalOrders: z.number(),
    averageOrderValue: z.number(),
    totalUnitsSold: z.number(),
    totalRefunded: z.number(),
  }),
  topProducts: z.array(
    z.object({
      productName: z.string(),
      sku: z.string().nullable(),
      unitsSold: z.number(),
      revenue: z.number(),
    })
  ),
  topSkuDeclines: z.array(
    z.object({
      productName: z.string(),
      sku: z.string().nullable(),
      previousRevenue: z.number(),
      currentRevenue: z.number(),
      deltaPct: z.number(),
      deltaValue: z.number(),
      contributionShare: z.number().nullable(),
    })
  ),
  profit: z.object({
    estimatedProfit: z.number().nullable(),
    marginPct: z.number().nullable(),
    lowMarginProducts: z.array(
      z.object({
        productName: z.string(),
        marginPct: z.number(),
      })
    ),
  }),
  insights: z.array(
    z.object({
      type: z.string(),
      title: z.string(),
      body: z.string(),
      severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
      deltaJson: z.record(z.unknown()).nullable(),
    })
  ),
})

const BodySchema = z.object({
  question: z.string().trim().min(2).max(500),
  context: ContextSchema,
})

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    await ensureCurrentUser(userId)
    await ensureShopifyTrialForUser(userId)

    const payload = BodySchema.parse(await request.json())
    const { plan, remainingToday } = await consumeShopifyCopilotAllowanceForUser(userId)

    const answer = generateShopifyCopilotAnswer({
      question: payload.question,
      context: payload.context,
    })

    const response: ShopifyCopilotResponse = {
      answer,
      plan,
      remainingQuestionsToday: remainingToday,
    }

    return NextResponse.json(response)
  } catch (error) {
    const status = error instanceof HttpError ? error.status : error instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: getErrorMessage(error) }, { status })
  }
}
