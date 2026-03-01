import { hasPlanAtLeast } from '@/lib/billing/plans'
import { getSubscriptionForUser, normalizeSubscriptionStatus, type SubscriptionRecord } from '@/lib/server/subscriptions'

export type BusinessFeatureGateReason =
  | 'ok'
  | 'plan_upgrade_required'
  | 'trial_expired'
  | 'inactive_subscription'

export type BusinessFeatureGate = {
  allowed: boolean
  reason: BusinessFeatureGateReason
  message: string | null
}

function isTrialExpired(subscription: SubscriptionRecord): boolean {
  if (normalizeSubscriptionStatus(subscription.status) !== 'trialing') {
    return false
  }

  if (!subscription.trialEndsAt) {
    return false
  }

  return subscription.trialEndsAt.getTime() < Date.now()
}

export async function getBusinessFeatureGate(userId: string): Promise<BusinessFeatureGate> {
  const subscription = await getSubscriptionForUser(userId)
  if (!subscription) {
    return {
      allowed: false,
      reason: 'inactive_subscription',
      message: 'Start your free trial to access Shopify insights.',
    }
  }

  const normalizedStatus = normalizeSubscriptionStatus(subscription.status)
  if (normalizedStatus !== 'active' && normalizedStatus !== 'trialing') {
    return {
      allowed: false,
      reason: 'inactive_subscription',
      message: 'Your subscription is inactive. Update billing to continue.',
    }
  }

  if (isTrialExpired(subscription)) {
    return {
      allowed: false,
      reason: 'trial_expired',
      message: 'Your trial has ended. Upgrade to continue.',
    }
  }

  if (!hasPlanAtLeast(subscription.plan, 'business')) {
    return {
      allowed: false,
      reason: 'plan_upgrade_required',
      message: 'Upgrade to Business to unlock live sync and notifications.',
    }
  }

  return {
    allowed: true,
    reason: 'ok',
    message: null,
  }
}
