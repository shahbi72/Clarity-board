export type PaidPlan = 'basic' | 'pro' | 'business'
export type EffectivePlan = PaidPlan | 'free'

export const PLAN_RANK: Record<EffectivePlan, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  business: 3,
}

export const BASIC_PRICE_ID =
  process.env.NEXT_PUBLIC_PADDLE_PRICE_BASIC_ID?.trim() ??
  process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER_ID?.trim() ??
  ''

export const PRO_PRICE_ID =
  process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_ID?.trim() ??
  process.env.NEXT_PUBLIC_PADDLE_PRICE_GROWTH_ID?.trim() ??
  ''

export const BUSINESS_PRICE_ID =
  process.env.NEXT_PUBLIC_PADDLE_PRICE_BUSINESS_ID?.trim() ??
  process.env.NEXT_PUBLIC_PADDLE_PRICE_SCALE_ID?.trim() ??
  ''

export const PRICE_ID_CONFIG = {
  BASIC_PRICE_ID,
  PRO_PRICE_ID,
  BUSINESS_PRICE_ID,
}

export function getPriceIdForPlan(plan: PaidPlan): string {
  switch (plan) {
    case 'basic':
      return BASIC_PRICE_ID
    case 'pro':
      return PRO_PRICE_ID
    case 'business':
      return BUSINESS_PRICE_ID
  }
}

export function normalizePaidPlan(value: string | null | undefined): PaidPlan | null {
  const normalized = value?.trim().toLowerCase() ?? ''
  if (normalized === 'basic' || normalized === 'pro' || normalized === 'business') {
    return normalized
  }

  return null
}

export function resolvePlanFromPriceId(priceId: string | null | undefined): PaidPlan | null {
  const normalized = priceId?.trim()
  if (!normalized) {
    return null
  }

  if (normalized === BASIC_PRICE_ID) {
    return 'basic'
  }
  if (normalized === PRO_PRICE_ID) {
    return 'pro'
  }
  if (normalized === BUSINESS_PRICE_ID) {
    return 'business'
  }

  return null
}

export function hasPlanAtLeast(
  currentPlan: EffectivePlan,
  requiredPlan: PaidPlan
): boolean {
  return PLAN_RANK[currentPlan] >= PLAN_RANK[requiredPlan]
}

export function toPlanLabel(plan: EffectivePlan): string {
  switch (plan) {
    case 'free':
      return 'Free'
    case 'basic':
      return 'Basic'
    case 'pro':
      return 'Pro'
    case 'business':
      return 'Business'
  }
}

export function getDatasetLimitForPlan(plan: EffectivePlan): number | null {
  if (plan === 'basic') {
    return 3
  }

  if (plan === 'pro' || plan === 'business') {
    return null
  }

  return 1
}
