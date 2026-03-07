import { NextResponse } from 'next/server'
import { z } from 'zod'
import { BASIC_PRICE_ID, BUSINESS_PRICE_ID, resolvePlanFromPriceId } from '@/lib/billing/plans'
import { jsonApiError, ApiRouteError } from '@/lib/server/api-response'
import { ensureCurrentUser, getCurrentUserIdentity } from '@/lib/server/auth'
import { getPaddleServerClient } from '@/lib/server/paddle'
import { getSubscriptionForUser } from '@/lib/server/subscriptions'

const BodySchema = z.object({
  priceId: z.string().trim().min(1),
})

function getCheckoutReturnUrl(): string | undefined {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ?? process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? ''
  if (!appUrl) {
    return undefined
  }

  return `${appUrl.replace(/\/+$/, '')}/dashboard/settings?billing=success`
}

export async function POST(request: Request) {
  try {
    const payload = BodySchema.parse(await request.json())
    const normalizedPriceId = payload.priceId.trim()
    const allowedPriceIds = [BASIC_PRICE_ID, BUSINESS_PRICE_ID].filter((value) => value.trim().length > 0)
    if (allowedPriceIds.length === 0) {
      throw new ApiRouteError(
        500,
        'billing_not_configured',
        'Checkout is unavailable because Paddle price IDs are not configured.'
      )
    }

    if (!allowedPriceIds.includes(normalizedPriceId)) {
      throw new ApiRouteError(
        400,
        'invalid_price_id',
        'priceId must match configured Starter or Business Paddle price IDs.'
      )
    }

    const resolvedPlan = resolvePlanFromPriceId(normalizedPriceId)
    if (!resolvedPlan) {
      throw new ApiRouteError(
        400,
        'invalid_price_id',
        'priceId does not map to a supported subscription plan.'
      )
    }

    const identity = await getCurrentUserIdentity()
    await ensureCurrentUser(identity.id)
    const existingSubscription = await getSubscriptionForUser(identity.id)
    const paddle = getPaddleServerClient()

    const transaction = await paddle.transactions.create({
      items: [{ priceId: normalizedPriceId, quantity: 1 }],
      collectionMode: 'automatic',
      customerId: existingSubscription?.paddleCustomerId ?? undefined,
      customData: {
        user_id: identity.id,
        plan: resolvedPlan,
        app: 'clarityboard-dashboard',
      },
      checkout: {
        url: getCheckoutReturnUrl(),
      },
    })

    const checkoutUrl = transaction.checkout?.url?.trim() ?? ''
    if (!checkoutUrl) {
      throw new ApiRouteError(
        502,
        'checkout_url_missing',
        'Paddle transaction was created without a checkout URL.'
      )
    }

    return NextResponse.json({
      priceId: normalizedPriceId,
      transactionId: transaction.id ?? null,
      checkoutUrl,
    })
  } catch (error) {
    return jsonApiError(error)
  }
}
