'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BASIC_PRICE_ID, BUSINESS_PRICE_ID } from '@/lib/billing/plans'
import { getPaddleInstance } from '@/lib/paddle/client'

type PricingPlansProps = {
  userId: string | null
}

type PlanId = 'basic' | 'business'

type PlanDefinition = {
  id: PlanId
  title: string
  subtitle: string
  priceLabel: string
  monthlyLabel: string
  featureList: string[]
  cta: string
  highlighted?: boolean
}

type CheckoutResponse = {
  priceId: string
  transactionId: string | null
  checkoutUrl: string
}

const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    id: 'basic',
    title: 'Starter',
    subtitle: 'CSV-first clarity for Shopify owners.',
    priceLabel: '$25',
    monthlyLabel: 'per month',
    featureList: [
      'Shopify Orders CSV upload',
      'Revenue, orders, AOV, units sold',
      'Top 5 products by revenue',
      '7-day / 30-day revenue trend',
      'AI Copilot (10 questions/day)',
    ],
    cta: 'Start Starter Trial',
  },
  {
    id: 'business',
    title: 'Business',
    subtitle: 'Live sync and insight notifications included.',
    priceLabel: '$39',
    monthlyLabel: 'per month',
    featureList: [
      'Everything in Starter',
      'Google Sheets live sync (5 min polling)',
      'Change insights (revenue/orders/AOV/top product)',
      'Notification bell with unread alerts',
      'AI Copilot (unlimited)',
    ],
    cta: 'Upgrade to Business Trial',
    highlighted: true,
  },
]

const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() ?? ''

function getPriceId(plan: PlanId): string {
  return plan === 'business' ? BUSINESS_PRICE_ID : BASIC_PRICE_ID
}

function getPlanUnavailableReason(plan: PlanId): string | null {
  if (!PADDLE_CLIENT_TOKEN) {
    return 'Billing checkout is temporarily unavailable while payment settings are being configured.'
  }

  if (!getPriceId(plan)) {
    return plan === 'business'
      ? 'Business plan is temporarily unavailable right now.'
      : 'Starter plan is temporarily unavailable right now.'
  }

  return null
}

function readApiError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const topLevelError = (payload as { error?: unknown }).error
  if (!topLevelError) {
    return null
  }

  if (typeof topLevelError === 'string') {
    return topLevelError
  }

  if (typeof topLevelError === 'object') {
    const message = (topLevelError as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return null
}

export function PricingPlans({ userId }: PricingPlansProps) {
  const router = useRouter()
  const [isOpeningCheckout, setIsOpeningCheckout] = useState<PlanId | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const visiblePlans = PLAN_DEFINITIONS.filter((plan) => !getPlanUnavailableReason(plan.id))
  const planUnavailableMessages = Array.from(
    new Set(
      PLAN_DEFINITIONS.map((plan) => getPlanUnavailableReason(plan.id)).filter(
        (message): message is string => Boolean(message)
      )
    )
  )

  useEffect(() => {
    if (visiblePlans.length === 0) {
      return
    }

    void getPaddleInstance().catch(() => {
      // Checkout invocation handles runtime errors explicitly.
    })
  }, [visiblePlans.length])

  const handleCheckout = async (plan: PlanId) => {
    setCheckoutError(null)
    const unavailableReason = getPlanUnavailableReason(plan)
    if (unavailableReason) {
      setCheckoutError(unavailableReason)
      return
    }

    if (!userId) {
      router.push('/signup')
      return
    }

    const priceId = getPriceId(plan)
    if (!priceId) {
      setCheckoutError(
        plan === 'business'
          ? 'Missing NEXT_PUBLIC_PADDLE_PRICE_BUSINESS_ID configuration.'
          : 'Missing NEXT_PUBLIC_PADDLE_PRICE_BASIC_ID configuration.'
      )
      return
    }

    setIsOpeningCheckout(plan)

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      })
      const payload = (await response.json()) as CheckoutResponse | { error?: unknown }
      if (!response.ok) {
        throw new Error(readApiError(payload) || 'Unable to open checkout.')
      }

      const paddle = await getPaddleInstance()
      const checkoutPayload = payload as CheckoutResponse
      if (checkoutPayload.transactionId) {
        paddle.Checkout.open({
          transactionId: checkoutPayload.transactionId,
          settings: {
            displayMode: 'overlay',
          },
        })
        return
      }

      window.location.assign(checkoutPayload.checkoutUrl)
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Unable to open Paddle checkout.')
    } finally {
      setIsOpeningCheckout(null)
    }
  }

  return (
    <section className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2">
      {visiblePlans.map((plan) => (
        <article
          key={plan.id}
          className={`rounded-2xl border p-6 shadow-sm ${
            plan.highlighted
              ? 'border-primary/60 bg-card ring-1 ring-primary/40'
              : 'border-border/80 bg-card'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">{plan.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.subtitle}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-semibold tracking-tight">{plan.priceLabel}</p>
              <p className="text-sm text-muted-foreground">{plan.monthlyLabel}</p>
            </div>
          </div>

          <ul className="mt-6 space-y-2">
            {plan.featureList.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 text-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={() => void handleCheckout(plan.id)}
              disabled={isOpeningCheckout !== null}
            >
              {isOpeningCheckout === plan.id ? 'Opening checkout...' : plan.cta}
            </Button>
            {plan.id === 'basic' ? (
              <Button variant="outline" asChild>
                <Link href="/demo">Try demo data first</Link>
              </Button>
            ) : null}
          </div>
        </article>
      ))}

      {visiblePlans.length === 0 ? (
        <p className="md:col-span-2 rounded-lg border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Paid plans are temporarily unavailable while billing configuration is being finalized.
          Please check back shortly.
        </p>
      ) : null}

      {planUnavailableMessages.length > 0 ? (
        <p className="md:col-span-2 rounded-lg border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {planUnavailableMessages.join(' ')}
        </p>
      ) : null}

      {checkoutError ? (
        <p className="md:col-span-2 rounded-lg border border-rose-300/50 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {checkoutError}
        </p>
      ) : null}
    </section>
  )
}
