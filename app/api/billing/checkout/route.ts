import { NextResponse } from 'next/server'
import { z } from 'zod'
import { jsonApiError, ApiRouteError } from '@/lib/server/api-response'
import { ensureCurrentUser, getCurrentUserIdentity } from '@/lib/server/auth'
import {
  getPaddleServerClient,
  normalizeBillingPlanId,
  resolvePriceIdForPlan,
  toSubscriptionPlan,
} from '@/lib/server/paddle'
import { getSubscriptionForUser } from '@/lib/server/subscriptions'

const BodySchema = z.object({
  planId: z.string().trim().min(1),
  userId: z.string().trim().min(1).optional(),
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
    const identity = await getCurrentUserIdentity()
    await ensureCurrentUser(identity.id)

    if (payload.userId && payload.userId !== identity.id) {
      throw new ApiRouteError(403, 'forbidden', 'userId does not match authenticated user.')
    }

    const planId = normalizeBillingPlanId(payload.planId)
    if (!planId) {
      throw new ApiRouteError(400, 'invalid_plan', 'planId must be "starter" or "business".')
    }

    const priceId = resolvePriceIdForPlan(planId)
    const existingSubscription = await getSubscriptionForUser(identity.id)
    const paddle = getPaddleServerClient()

    const transaction = await paddle.transactions.create({
      items: [{ priceId, quantity: 1 }],
      collectionMode: 'automatic',
      customerId: existingSubscription?.paddleCustomerId ?? undefined,
      customData: {
        user_id: identity.id,
        plan: toSubscriptionPlan(planId),
        app: 'clarityboard-dashboard',
      },
      checkout: {
        url: getCheckoutReturnUrl(),
      },
    })

    return NextResponse.json({
      planId,
      transactionId: transaction.id,
      checkoutUrl: transaction.checkout?.url ?? null,
    })
  } catch (error) {
    return jsonApiError(error)
  }
}
