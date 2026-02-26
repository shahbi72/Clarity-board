import {
  getDatasetLimitForPlan,
  hasPlanAtLeast,
  normalizePaidPlan,
  resolvePlanFromPriceId,
  type EffectivePlan,
  type PaidPlan,
} from '@/lib/billing/plans'
import { getCurrentUserId } from '@/lib/server/auth'
import { HttpError } from '@/lib/server/http-error'
import { prisma } from '@/lib/server/prisma'
import { getSupabaseServiceRoleClient } from '@/lib/supabase/admin'

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused'

export type SubscriptionRecord = {
  userId: string
  plan: PaidPlan
  planPriceId: string | null
  status: SubscriptionStatus
  paddleCustomerId: string | null
  paddleSubscriptionId: string | null
  currentPeriodEnd: Date | null
  updatedAt: Date
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>(['active', 'trialing'])

const BASIC_MONTHLY_AI_INSIGHTS_LIMIT = 5

type UpsertSubscriptionInput = {
  userId: string
  plan: PaidPlan
  planPriceId?: string | null
  status: SubscriptionStatus | string
  paddleCustomerId?: string | null
  paddleSubscriptionId?: string | null
  currentPeriodEnd?: Date | null
}

type SubscriptionRow = {
  user_id: string
  plan: string
  plan_price_id: string | null
  status: string
  paddle_customer_id: string | null
  paddle_subscription_id: string | null
  current_period_end: string | null
  updated_at: string | null
}

function mapRowToRecord(row: SubscriptionRow): SubscriptionRecord | null {
  const plan = normalizePaidPlan(row.plan)
  if (!plan) {
    return null
  }

  return {
    userId: row.user_id,
    plan,
    planPriceId: row.plan_price_id,
    status: normalizeSubscriptionStatus(row.status),
    paddleCustomerId: row.paddle_customer_id,
    paddleSubscriptionId: row.paddle_subscription_id,
    currentPeriodEnd: parsePaddleDate(row.current_period_end),
    updatedAt: parsePaddleDate(row.updated_at) ?? new Date(),
  }
}

function getCurrentMonthKey(now = new Date()): string {
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function toIsoDateTime(value: Date | null | undefined): string | null {
  if (!value) {
    return null
  }

  return value.toISOString()
}

export function normalizeSubscriptionStatus(value: string | null | undefined): SubscriptionStatus {
  const normalized = value?.trim().toLowerCase() ?? ''

  switch (normalized) {
    case 'active':
    case 'completed':
    case 'paid':
    case 'billed':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
      return 'past_due'
    case 'paused':
      return 'paused'
    case 'cancelled':
    case 'canceled':
    case 'refunded':
      return 'canceled'
    default:
      return 'canceled'
  }
}

export function mapPaddleTransactionStatus(status: string | null | undefined): SubscriptionStatus {
  return normalizeSubscriptionStatus(status)
}

export function parsePaddleDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function isSubscriptionActiveStatus(status: string | null | undefined): boolean {
  if (!status) {
    return false
  }

  return ACTIVE_SUBSCRIPTION_STATUSES.has(normalizeSubscriptionStatus(status))
}

export function resolveEffectivePlan(subscription: SubscriptionRecord | null): EffectivePlan {
  if (!subscription || !isSubscriptionActiveStatus(subscription.status)) {
    return 'free'
  }

  return subscription.plan
}

export async function getSubscriptionForUser(userId: string): Promise<SubscriptionRecord | null> {
  let supabase

  try {
    supabase = getSupabaseServiceRoleClient()
  } catch {
    return null
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      'user_id, plan, plan_price_id, status, paddle_customer_id, paddle_subscription_id, current_period_end, updated_at'
    )
    .eq('user_id', userId)
    .maybeSingle<SubscriptionRow>()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }

    throw new HttpError(500, error.message)
  }

  if (!data) {
    return null
  }

  return mapRowToRecord(data)
}

export async function getCurrentUserSubscription(): Promise<SubscriptionRecord | null> {
  const userId = await getCurrentUserId()
  return getSubscriptionForUser(userId)
}

export async function getEffectivePlanForUser(userId: string): Promise<EffectivePlan> {
  const subscription = await getSubscriptionForUser(userId)
  return resolveEffectivePlan(subscription)
}

export async function requirePlanForUser(
  userId: string,
  requiredPlan: PaidPlan
): Promise<{
  subscription: SubscriptionRecord | null
  effectivePlan: EffectivePlan
}> {
  const subscription = await getSubscriptionForUser(userId)
  const effectivePlan = resolveEffectivePlan(subscription)

  if (!hasPlanAtLeast(effectivePlan, requiredPlan)) {
    throw new HttpError(402, `Plan upgrade required: ${requiredPlan}.`)
  }

  return { subscription, effectivePlan }
}

export async function requirePlanForCurrentUser(requiredPlan: PaidPlan): Promise<{
  subscription: SubscriptionRecord | null
  effectivePlan: EffectivePlan
}> {
  const userId = await getCurrentUserId()
  return requirePlanForUser(userId, requiredPlan)
}

export async function requireBasicPlanForUser(userId: string) {
  return requirePlanForUser(userId, 'basic')
}

export async function requireProPlanForUser(userId: string) {
  return requirePlanForUser(userId, 'pro')
}

export async function requireBusinessPlanForUser(userId: string) {
  return requirePlanForUser(userId, 'business')
}

export async function getDatasetLimitForUser(userId: string): Promise<number | null> {
  const plan = await getEffectivePlanForUser(userId)
  return getDatasetLimitForPlan(plan)
}

export async function consumeAiInsightAllowanceForUser(userId: string): Promise<{
  plan: EffectivePlan
  remainingThisMonth: number | null
}> {
  const plan = await getEffectivePlanForUser(userId)

  if (!hasPlanAtLeast(plan, 'basic')) {
    throw new HttpError(402, 'Basic plan required for AI insights.')
  }

  if (plan !== 'basic') {
    return { plan, remainingThisMonth: null }
  }

  const monthKey = getCurrentMonthKey()

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.aiInsightUsage.findUnique({
      where: {
        userId_monthKey: {
          userId,
          monthKey,
        },
      },
    })

    const usedCount = existing?.usedCount ?? 0
    if (usedCount >= BASIC_MONTHLY_AI_INSIGHTS_LIMIT) {
      throw new HttpError(
        402,
        `Basic plan includes ${BASIC_MONTHLY_AI_INSIGHTS_LIMIT} AI insights per month. Upgrade to Pro for unlimited insights.`
      )
    }

    const nextCount = usedCount + 1
    await tx.aiInsightUsage.upsert({
      where: {
        userId_monthKey: {
          userId,
          monthKey,
        },
      },
      create: {
        userId,
        monthKey,
        usedCount: nextCount,
      },
      update: {
        usedCount: nextCount,
      },
    })

    return BASIC_MONTHLY_AI_INSIGHTS_LIMIT - nextCount
  })

  return { plan, remainingThisMonth: result }
}

export async function upsertSubscriptionForUser({
  userId,
  plan,
  planPriceId,
  status,
  paddleCustomerId,
  paddleSubscriptionId,
  currentPeriodEnd,
}: UpsertSubscriptionInput): Promise<SubscriptionRecord> {
  const supabase = getSupabaseServiceRoleClient()

  const payload = {
    user_id: userId,
    plan,
    plan_price_id: planPriceId ?? null,
    status: normalizeSubscriptionStatus(status),
    paddle_customer_id: paddleCustomerId ?? null,
    paddle_subscription_id: paddleSubscriptionId ?? null,
    current_period_end: toIsoDateTime(currentPeriodEnd),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .upsert(payload, {
      onConflict: 'user_id',
    })
    .select(
      'user_id, plan, plan_price_id, status, paddle_customer_id, paddle_subscription_id, current_period_end, updated_at'
    )
    .single<SubscriptionRow>()

  if (error) {
    throw new HttpError(500, error.message)
  }

  const mapped = mapRowToRecord(data)
  if (!mapped) {
    throw new HttpError(500, 'Unable to map subscription row.')
  }

  return mapped
}

export async function findSubscriptionByPaddleIdentifiers({
  paddleCustomerId,
  paddleSubscriptionId,
}: {
  paddleCustomerId?: string | null
  paddleSubscriptionId?: string | null
}): Promise<SubscriptionRecord | null> {
  const supabase = getSupabaseServiceRoleClient()

  if (paddleSubscriptionId && paddleSubscriptionId.trim().length > 0) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(
        'user_id, plan, plan_price_id, status, paddle_customer_id, paddle_subscription_id, current_period_end, updated_at'
      )
      .eq('paddle_subscription_id', paddleSubscriptionId.trim())
      .maybeSingle<SubscriptionRow>()

    if (error && error.code !== 'PGRST116') {
      throw new HttpError(500, error.message)
    }

    if (data) {
      return mapRowToRecord(data)
    }
  }

  if (paddleCustomerId && paddleCustomerId.trim().length > 0) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(
        'user_id, plan, plan_price_id, status, paddle_customer_id, paddle_subscription_id, current_period_end, updated_at'
      )
      .eq('paddle_customer_id', paddleCustomerId.trim())
      .maybeSingle<SubscriptionRow>()

    if (error && error.code !== 'PGRST116') {
      throw new HttpError(500, error.message)
    }

    if (data) {
      return mapRowToRecord(data)
    }
  }

  return null
}

export function resolvePlanForTransaction({
  explicitPlan,
  planPriceId,
  existingSubscription,
}: {
  explicitPlan?: string | null
  planPriceId?: string | null
  existingSubscription?: SubscriptionRecord | null
}): PaidPlan | null {
  const planFromCustomData = normalizePaidPlan(explicitPlan)
  if (planFromCustomData) {
    return planFromCustomData
  }

  const planFromPriceId = resolvePlanFromPriceId(planPriceId)
  if (planFromPriceId) {
    return planFromPriceId
  }

  return existingSubscription?.plan ?? null
}
