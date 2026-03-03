import { Environment, Paddle } from '@paddle/paddle-node-sdk'
import { BASIC_PRICE_ID, BUSINESS_PRICE_ID } from '@/lib/billing/plans'
import { HttpError } from '@/lib/server/http-error'

export type BillingPlanId = 'starter' | 'business'

let paddleClient: Paddle | null = null

function getPaddleEnvironment(): Environment {
  const raw = process.env.NEXT_PUBLIC_PADDLE_ENV?.trim().toLowerCase()
  return raw === 'production' ? Environment.production : Environment.sandbox
}

export function getPaddleServerClient(): Paddle {
  if (paddleClient) {
    return paddleClient
  }

  const apiKey = process.env.PADDLE_API_KEY?.trim() ?? ''
  if (!apiKey) {
    throw new HttpError(500, 'PADDLE_API_KEY is not configured.')
  }

  paddleClient = new Paddle(apiKey, {
    environment: getPaddleEnvironment(),
  })

  return paddleClient
}

export function resolvePriceIdForPlan(planId: BillingPlanId): string {
  const priceId = planId === 'business' ? BUSINESS_PRICE_ID : BASIC_PRICE_ID
  if (!priceId) {
    throw new HttpError(
      500,
      planId === 'business'
        ? 'Missing NEXT_PUBLIC_PADDLE_PRICE_BUSINESS_ID.'
        : 'Missing NEXT_PUBLIC_PADDLE_PRICE_BASIC_ID.'
    )
  }

  return priceId
}

export function normalizeBillingPlanId(value: string | null | undefined): BillingPlanId | null {
  const normalized = value?.trim().toLowerCase() ?? ''
  if (normalized === 'starter' || normalized === 'basic') {
    return 'starter'
  }

  if (normalized === 'business' || normalized === 'pro') {
    return 'business'
  }

  return null
}

export function toSubscriptionPlan(planId: BillingPlanId): 'basic' | 'business' {
  return planId === 'business' ? 'business' : 'basic'
}
