'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { getPaddleInstance } from '@/lib/paddle/client'
import { Button } from '@/components/ui/button'

type PricingPlansProps = {
  userId: string | null
}

type PricingPlan = {
  name: string
  priceLabel: string
  priceId: string
  description: string
  features: string[]
}

function getPlans(): PricingPlan[] {
  return [
    {
      name: 'Starter',
      priceLabel: '$19',
      priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER_ID?.trim() ?? '',
      description: 'For solo operators and small teams getting started.',
      features: ['3 connected datasets', 'Core dashboard analytics', 'Email support'],
    },
    {
      name: 'Pro',
      priceLabel: '$49',
      priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_GROWTH_ID?.trim() ?? '',
      description: 'For teams running recurring reporting and forecasting workflows.',
      features: ['Unlimited datasets', 'AI insights assistant', 'Priority email support'],
    },
    {
      name: 'Business',
      priceLabel: '$99',
      priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_SCALE_ID?.trim() ?? '',
      description: 'For operations that need scale, controls, and higher-volume usage.',
      features: ['Advanced automations', 'Higher AI usage limits', 'Dedicated onboarding'],
    },
  ]
}

export function PricingPlans({ userId }: PricingPlansProps) {
  const router = useRouter()
  const [pendingPriceId, setPendingPriceId] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const plans = useMemo(() => getPlans(), [])

  const hasMissingPriceIds = plans.some((plan) => plan.priceId.length === 0)

  const handleCheckout = async (plan: PricingPlan) => {
    setCheckoutError(null)

    if (!userId) {
      router.push('/login?next=/pricing')
      return
    }

    if (!plan.priceId) {
      setCheckoutError('This plan is not configured yet. Add the Paddle price ID env var.')
      return
    }

    setPendingPriceId(plan.priceId)

    try {
      const paddle = await getPaddleInstance()
      paddle.Checkout.open({
        items: [{ priceId: plan.priceId, quantity: 1 }],
        customData: {
          user_id: userId,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to open checkout.'
      setCheckoutError(message)
    } finally {
      setPendingPriceId(null)
    }
  }

  return (
    <div className="space-y-4">
      {hasMissingPriceIds ? (
        <p className="rounded-lg border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Paddle price IDs are missing for one or more plans.
        </p>
      ) : null}

      {checkoutError ? (
        <p className="rounded-lg border border-rose-300/50 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {checkoutError}
        </p>
      ) : null}

      <section className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
        {plans.map((plan) => {
          const isPending = pendingPriceId === plan.priceId
          return (
            <article key={plan.name} className="rounded-xl border border-border/80 bg-card p-6">
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <p className="mt-1 text-3xl font-semibold">{plan.priceLabel}</p>
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              <ul className="mt-5 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-6 w-full"
                disabled={isPending || !plan.priceId}
                onClick={() => void handleCheckout(plan)}
              >
                {isPending ? 'Opening checkout...' : 'Choose plan'}
              </Button>
            </article>
          )
        })}
      </section>
    </div>
  )
}
