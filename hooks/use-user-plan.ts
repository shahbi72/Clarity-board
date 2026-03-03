'use client'

import { useMemo } from 'react'
import { useDashboardData } from '@/components/dashboard/dashboard-data-provider'

export type UserPlan = 'free' | 'starter' | 'business' | 'trial'

export type UserPlanState = {
  plan: UserPlan
  isStarter: boolean
  isBusiness: boolean
  isTrial: boolean
  trialDaysLeft: number
  trialEndsAt: string | null
  subscriptionStatus: string | null
}

function normalizePlan(planType: 'starter' | 'business', effectivePlan: string | null): UserPlan {
  if (effectivePlan === 'business' || effectivePlan === 'pro') {
    return 'business'
  }

  if (effectivePlan === 'basic') {
    return 'starter'
  }

  return planType === 'business' ? 'business' : 'starter'
}

function calculateTrialDaysLeft(trialEndsAt: string | null): number {
  if (!trialEndsAt) {
    return 0
  }

  const end = new Date(trialEndsAt)
  if (Number.isNaN(end.getTime())) {
    return 0
  }

  const msLeft = end.getTime() - Date.now()
  if (msLeft <= 0) {
    return 0
  }

  return Math.ceil(msLeft / (24 * 60 * 60 * 1000))
}

export function useUserPlan(): UserPlanState {
  const { planType, effectivePlan, billingGate } = useDashboardData()

  return useMemo(() => {
    const normalizedPlan = normalizePlan(planType, effectivePlan ?? null)
    const status = billingGate?.status ?? null
    const trialEndsAt = billingGate?.trialEndsAt ?? null
    const trialDaysLeft = calculateTrialDaysLeft(trialEndsAt)
    const isTrial = status === 'trialing' && trialDaysLeft > 0
    const isInactive = status === 'canceled' || status === 'past_due' || status === 'paused'

    let plan: UserPlan
    if (isTrial) {
      plan = 'trial'
    } else if (isInactive) {
      plan = 'free'
    } else {
      plan = normalizedPlan
    }

    return {
      plan,
      isStarter: plan === 'starter' || plan === 'trial',
      isBusiness: plan === 'business',
      isTrial,
      trialDaysLeft,
      trialEndsAt,
      subscriptionStatus: status,
    }
  }, [billingGate?.status, billingGate?.trialEndsAt, effectivePlan, planType])
}
