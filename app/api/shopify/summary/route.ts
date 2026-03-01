import { NextResponse } from 'next/server'
import { ensureCurrentUser, getCurrentUserId } from '@/lib/server/auth'
import { getErrorMessage, HttpError } from '@/lib/server/http-error'
import { getShopifySummaryForUser } from '@/lib/server/shopify-summary'
import {
  ensureShopifyTrialForUser,
  getEffectivePlanForUser,
  getShopifyBillingGate,
} from '@/lib/server/subscriptions'
import type { ShopifySummaryApiResponse, ShopifyTrendRangeDays } from '@/lib/types/shopify'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId()
    await ensureCurrentUser(userId)
    await ensureShopifyTrialForUser(userId)

    const url = new URL(request.url)
    const rangeDays = parseRangeDays(url.searchParams.get('rangeDays'))
    const includeCancelled = parseBoolean(url.searchParams.get('includeCancelled'))

    const gate = await getShopifyBillingGate(userId)
    const plan = await getEffectivePlanForUser(userId)
    if (!gate.allowed) {
      const response: ShopifySummaryApiResponse = {
        paywalled: true,
        plan,
        gate: {
          ...gate,
          trialEndsAt: gate.trialEndsAt ? gate.trialEndsAt.toISOString() : null,
        },
      }
      return NextResponse.json(response, { status: 402 })
    }

    const summary = await getShopifySummaryForUser({
      userId,
      rangeDays,
      includeCancelled,
    })

    const response: ShopifySummaryApiResponse = {
      paywalled: false,
      plan,
      gate: {
        ...gate,
        trialEndsAt: gate.trialEndsAt ? gate.trialEndsAt.toISOString() : null,
      },
      summary,
    }
    return NextResponse.json(response)
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const response: ShopifySummaryApiResponse = {
      paywalled: false,
      error: getErrorMessage(error),
    }
    return NextResponse.json(response, { status })
  }
}

function parseRangeDays(value: string | null): ShopifyTrendRangeDays {
  return value === '30' ? 30 : 7
}

function parseBoolean(value: string | null): boolean {
  return value === '1' || value === 'true'
}
