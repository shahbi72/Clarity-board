'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  BUSINESS_PRICE_ID,
  PRICE_ID_CONFIG,
  PRO_PRICE_ID,
  BASIC_PRICE_ID,
  type PaidPlan,
} from '@/lib/billing/plans'
import { getPaddleInstance } from '@/lib/paddle/client'

type PricingPlansProps = {
  userId: string | null
  userEmail: string | null
}

type PlanCard = {
  name: 'Free' | 'Basic' | 'Pro' | 'Business'
  plan: PaidPlan | 'free'
  priceLabel: string
  description: string
  features: string[]
  priceId: string | null
  highlighted?: boolean
}

const PLAN_CARDS: PlanCard[] = [
  {
    name: 'Free',
    plan: 'free',
    priceLabel: '$0',
    description: 'For trying Clarityboard before upgrading to premium.',
    features: ['Core workspace access', 'Basic dashboard view', 'Limited in-app features'],
    priceId: null,
  },
  {
    name: 'Basic',
    plan: 'basic',
    priceLabel: '$19',
    description: 'For individual operators running weekly analytics.',
    features: ['Full dashboard access', 'Up to 3 datasets', 'AI insights (5 per month)'],
    priceId: BASIC_PRICE_ID,
  },
  {
    name: 'Pro',
    plan: 'pro',
    priceLabel: '$49',
    description: 'For teams that need forecasting, exports, and full AI.',
    features: ['Unlimited datasets', 'Unlimited AI insights', 'Exports and forecasting'],
    priceId: PRO_PRICE_ID,
    highlighted: true,
  },
  {
    name: 'Business',
    plan: 'business',
    priceLabel: '$129',
    description: 'For high-scale operations and upcoming multi-user controls.',
    features: ['Everything in Pro', 'Business-grade workflows', 'Multi-user feature flag'],
    priceId: BUSINESS_PRICE_ID,
  },
]

export function PricingPlans({ userId, userEmail }: PricingPlansProps) {
  const router = useRouter()
  const [pendingPlan, setPendingPlan] = useState<PaidPlan | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  useEffect(() => {
    void getPaddleInstance().catch(() => {
      // The checkout action surfaces detailed runtime errors when invoked.
    })
  }, [])

  const hasMissingPriceIds = useMemo(
    () =>
      !PRICE_ID_CONFIG.BASIC_PRICE_ID ||
      !PRICE_ID_CONFIG.PRO_PRICE_ID ||
      !PRICE_ID_CONFIG.BUSINESS_PRICE_ID,
    []
  )

  const handleCheckout = async (plan: PaidPlan, priceId: string) => {
    setCheckoutError(null)

    if (!userId) {
      router.push('/signup')
      return
    }

    if (!priceId) {
      setCheckoutError('This plan is not configured yet. Add the Paddle price ID env var.')
      return
    }

    setPendingPlan(plan)

    try {
      const paddle = await getPaddleInstance()
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: userEmail ? { email: userEmail } : undefined,
        customData: {
          user_id: userId,
          plan,
          app: 'clarityboard',
          env: process.env.NEXT_PUBLIC_PADDLE_ENV ?? 'sandbox',
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to open checkout.'
      setCheckoutError(message)
    } finally {
      setPendingPlan(null)
    }
  }

  return (
    <div className="space-y-4">
      {hasMissingPriceIds ? (
        <p className="rounded-lg border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Paddle price IDs are missing for one or more paid plans.
        </p>
      ) : null}

      {checkoutError ? (
        <p className="rounded-lg border border-rose-300/50 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {checkoutError}
        </p>
      ) : null}

      <section className="mx-auto mt-10 grid max-w-6xl gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_CARDS.map((plan) => {
          const isPending = pendingPlan === plan.plan
          const paidPlan = plan.plan === 'free' ? null : plan.plan

          return (
            <article
              key={plan.name}
              className={`rounded-xl border bg-card p-6 ${
                plan.highlighted
                  ? 'border-primary shadow-[0_0_0_1px_rgba(59,130,246,0.35)]'
                  : 'border-border/80'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                {plan.highlighted ? (
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                    Most Popular
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-3xl font-semibold">{plan.priceLabel}</p>
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>

              <ul className="mt-5 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {!paidPlan ? (
                <Button className="mt-6 w-full" variant="outline" asChild>
                  <Link href="/signup">Start free</Link>
                </Button>
              ) : (
                <Button
                  className="mt-6 w-full"
                  disabled={isPending || !plan.priceId}
                  onClick={() => void handleCheckout(paidPlan, plan.priceId ?? '')}
                >
                  {isPending ? 'Opening checkout...' : 'Upgrade'}
                </Button>
              )}
            </article>
          )
        })}
      </section>
    </div>
  )
}
