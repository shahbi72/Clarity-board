'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BASIC_PRICE_ID } from '@/lib/billing/plans'
import { getPaddleInstance } from '@/lib/paddle/client'

type PricingPlansProps = {
  userId: string | null
  userEmail: string | null
}

const FEATURES = [
  'Shopify Orders CSV upload',
  'Revenue, orders, AOV, units sold',
  'Top 5 products by revenue',
  '7-day / 30-day revenue trend',
]

export function PricingPlans({ userId, userEmail }: PricingPlansProps) {
  const router = useRouter()
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  useEffect(() => {
    void getPaddleInstance().catch(() => {
      // Checkout invocation handles runtime errors explicitly.
    })
  }, [])

  const handleCheckout = async () => {
    setCheckoutError(null)

    if (!userId) {
      router.push('/signup')
      return
    }

    if (!BASIC_PRICE_ID) {
      setCheckoutError('Missing NEXT_PUBLIC_PADDLE_PRICE_BASIC_ID configuration.')
      return
    }

    setIsOpeningCheckout(true)

    try {
      const paddle = await getPaddleInstance()
      paddle.Checkout.open({
        items: [{ priceId: BASIC_PRICE_ID, quantity: 1 }],
        customer: userEmail ? { email: userEmail } : undefined,
        customData: {
          user_id: userId,
          plan: 'basic',
          app: 'clarityboard-shopify',
        },
      })
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Unable to open Paddle checkout.')
    } finally {
      setIsOpeningCheckout(false)
    }
  }

  return (
    <section className="mx-auto mt-10 grid max-w-4xl gap-6">
      <article className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Shopify Plan</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              7-day free trial, then $25/month. Paddle billing.
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-semibold tracking-tight">$25</p>
            <p className="text-sm text-muted-foreground">per month</p>
          </div>
        </div>

        <ul className="mt-6 space-y-2">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 text-primary" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {checkoutError ? (
          <p className="mt-4 rounded-lg border border-rose-300/50 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {checkoutError}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => void handleCheckout()} disabled={isOpeningCheckout}>
            {isOpeningCheckout ? 'Opening checkout...' : 'Start 7-day free trial'}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard?demo=1">Try demo data first</Link>
          </Button>
        </div>
      </article>
    </section>
  )
}
