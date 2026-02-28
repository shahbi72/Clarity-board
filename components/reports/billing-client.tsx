'use client'

import { useEffect, useState } from 'react'

type BillingState = {
  gate: {
    allowed: boolean
    reason: string
    trialEndsAt: string | null
  }
  subscription: {
    status: string
    trialEndsAt: string | null
    currentPeriodEnd: string | null
  } | null
}

export function BillingClient() {
  const [state, setState] = useState<BillingState | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/reports/billing/status', { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) {
        setState(json.data as BillingState)
      }
    })()
  }, [])

  return (
    <section className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">Billing</h2>
      <p className="text-sm text-slate-300">7-day free trial, then Paddle subscription.</p>

      {state ? (
        <div className="rounded border border-slate-700 p-3 text-sm">
          <p>Status: {state.subscription?.status ?? 'not_started'}</p>
          <p>Trial ends: {state.subscription?.trialEndsAt ?? 'n/a'}</p>
          <p>Access allowed: {state.gate.allowed ? 'yes' : 'no'}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <a href="/pricing" className="rounded bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950">
          Open Paddle Checkout
        </a>
        <a
          href={process.env.NEXT_PUBLIC_PADDLE_MANAGEMENT_URL || 'mailto:clarityboard.app@gmail.com'}
          target="_blank"
          rel="noreferrer"
          className="rounded border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100"
        >
          Paddle Portal / Support
        </a>
      </div>
    </section>
  )
}

