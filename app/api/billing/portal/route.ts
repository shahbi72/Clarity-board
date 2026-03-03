import { NextResponse } from 'next/server'
import { jsonApiError, ApiRouteError } from '@/lib/server/api-response'
import { ensureCurrentUser, getCurrentUserId } from '@/lib/server/auth'
import { getPaddleServerClient } from '@/lib/server/paddle'
import { getSubscriptionForUser } from '@/lib/server/subscriptions'

function getPortalFallbackUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_PADDLE_MANAGEMENT_URL?.trim() ?? ''
  if (configured) {
    return configured
  }

  return null
}

async function handlePortalRequest() {
  try {
    const userId = await getCurrentUserId()
    await ensureCurrentUser(userId)
    const subscription = await getSubscriptionForUser(userId)

    if (!subscription?.paddleCustomerId) {
      const fallbackUrl = getPortalFallbackUrl()
      if (!fallbackUrl) {
        throw new ApiRouteError(
          404,
          'customer_not_found',
          'No Paddle customer is linked to this account yet.'
        )
      }

      return NextResponse.json({ url: fallbackUrl, source: 'fallback' as const })
    }

    if (!subscription.paddleSubscriptionId) {
      const fallbackUrl = getPortalFallbackUrl()
      if (!fallbackUrl) {
        throw new ApiRouteError(
          404,
          'subscription_not_found',
          'No active Paddle subscription is linked to this account yet.'
        )
      }

      return NextResponse.json({ url: fallbackUrl, source: 'fallback' as const })
    }

    const paddle = getPaddleServerClient()
    const session = await paddle.customerPortalSessions.create(subscription.paddleCustomerId, [
      subscription.paddleSubscriptionId,
    ])

    const subscriptionUrl = session.urls.subscriptions.find(
      (item) => item.id === subscription.paddleSubscriptionId
    )

    return NextResponse.json({
      url: session.urls.general.overview ?? subscriptionUrl?.cancelSubscription,
      source: 'paddle' as const,
    })
  } catch (error) {
    return jsonApiError(error)
  }
}

export async function GET() {
  return handlePortalRequest()
}

export async function POST() {
  return handlePortalRequest()
}
