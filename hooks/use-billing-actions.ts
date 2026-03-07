'use client'

import { useCallback, useState } from 'react'
import { BASIC_PRICE_ID, BUSINESS_PRICE_ID } from '@/lib/billing/plans'
import { getPaddleInstance } from '@/lib/paddle/client'

type BillingPlanId = 'starter' | 'business'

type CheckoutResponse = {
  priceId: string
  transactionId: string | null
  checkoutUrl: string
}

function resolvePriceId(planId: BillingPlanId): string {
  return planId === 'business' ? BUSINESS_PRICE_ID : BASIC_PRICE_ID
}

function readApiError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const topError = (payload as { error?: unknown }).error
  if (!topError) {
    return null
  }

  if (typeof topError === 'string') {
    return topError
  }

  if (typeof topError === 'object') {
    const message = (topError as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return null
}

export function useBillingActions() {
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)

  const openCheckout = useCallback(
    async (planId: BillingPlanId) => {
      setBillingError(null)
      setCheckoutLoading(true)

      try {
        const priceId = resolvePriceId(planId)
        if (!priceId) {
          throw new Error(
            planId === 'business'
              ? 'Business checkout is temporarily unavailable.'
              : 'Starter checkout is temporarily unavailable.'
          )
        }

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

        const checkout = payload as CheckoutResponse
        const paddle = await getPaddleInstance()
        if (checkout.transactionId) {
          paddle.Checkout.open({
            transactionId: checkout.transactionId,
            settings: {
              displayMode: 'overlay',
            },
          })
          return
        }

        window.location.assign(checkout.checkoutUrl)
      } catch (error) {
        setBillingError(error instanceof Error ? error.message : 'Unable to open checkout.')
      } finally {
        setCheckoutLoading(false)
      }
    },
    []
  )

  const openPortal = useCallback(async () => {
    setBillingError(null)
    setPortalLoading(true)

    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      })
      const payload = (await response.json()) as { url?: string; error?: unknown }
      if (!response.ok) {
        throw new Error(readApiError(payload) || 'Unable to open customer portal.')
      }

      if (!payload.url) {
        throw new Error('Customer portal URL was not returned.')
      }

      window.open(payload.url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : 'Unable to open customer portal.')
    } finally {
      setPortalLoading(false)
    }
  }, [])

  return {
    checkoutLoading,
    portalLoading,
    billingError,
    setBillingError,
    openCheckout,
    openPortal,
  }
}
