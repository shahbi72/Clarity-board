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

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused'

export type ShopifyBillingGate = {
  allowed: boolean
  reason: 'ok' | 'missing_subscription' | 'trial_expired' | 'inactive_subscription'
  status: SubscriptionStatus | null
  trialEndsAt: Date | null
}

export type SubscriptionRecord = {
  userId: string
  plan: PaidPlan
  planPriceId: string | null
  status: SubscriptionStatus
  provider: 'PADDLE'
  paddleCustomerId: string | null
  paddleSubscriptionId: string | null
  trialEndsAt: Date | null
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
  trialEndsAt?: Date | null
  currentPeriodEnd?: Date | null
  canceledAt?: Date | null
}

function getCurrentMonthKey(now = new Date()): string {
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function normalizePlanForStorage(value: string | null | undefined): PaidPlan | null {
  const normalized = value?.trim().toLowerCase() ?? ''
  if (normalized === 'starter') {
    return 'basic'
  }
  return normalizePaidPlan(normalized)
}

export function normalizeSubscriptionStatus(value: string | null | undefined): SubscriptionStatus {
  const normalized = value?.trim().toLowerCase() ?? ''

  switch (normalized) {
    case 'active':
    case 'completed':
    case 'paid':
    case 'billed':
    case 'payment_succeeded':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
    case 'payment_failed':
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

function mapPrismaRowToRecord(row: {
  userId: string
  plan: string
  planPriceId: string | null
  status: string
  provider: string
  paddleCustomerId: string | null
  paddleSubscriptionId: string | null
  trialEndsAt: Date | null
  currentPeriodEnd: Date | null
  updatedAt: Date
}): SubscriptionRecord | null {
  const plan = normalizePlanForStorage(row.plan)
  if (!plan) {
    return null
  }

  if (row.provider !== 'PADDLE') {
    return null
  }

  return {
    userId: row.userId,
    plan,
    planPriceId: row.planPriceId,
    status: normalizeSubscriptionStatus(row.status),
    provider: 'PADDLE',
    paddleCustomerId: row.paddleCustomerId,
    paddleSubscriptionId: row.paddleSubscriptionId,
    trialEndsAt: row.trialEndsAt,
    currentPeriodEnd: row.currentPeriodEnd,
    updatedAt: row.updatedAt,
  }
}

export async function getSubscriptionForUser(userId: string): Promise<SubscriptionRecord | null> {
  const row = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      userId: true,
      plan: true,
      planPriceId: true,
      status: true,
      provider: true,
      paddleCustomerId: true,
      paddleSubscriptionId: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      updatedAt: true,
    },
  })

  if (!row) {
    return null
  }

  return mapPrismaRowToRecord(row)
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
  trialEndsAt,
  currentPeriodEnd,
  canceledAt,
}: UpsertSubscriptionInput): Promise<SubscriptionRecord> {
  const normalizedPlan = normalizePlanForStorage(plan)
  if (!normalizedPlan) {
    throw new HttpError(400, 'Invalid plan value for subscription update.')
  }

  const row = await prisma.subscription.upsert({
    where: { userId },
    update: {
      workspaceId: undefined,
      provider: 'PADDLE',
      plan: normalizedPlan,
      planPriceId: planPriceId ?? null,
      status: normalizeSubscriptionStatus(status),
      paddleCustomerId: paddleCustomerId ?? null,
      paddleSubscriptionId: paddleSubscriptionId ?? null,
      trialEndsAt: trialEndsAt ?? undefined,
      currentPeriodEnd: currentPeriodEnd ?? null,
      canceledAt: canceledAt ?? null,
    },
    create: {
      userId,
      provider: 'PADDLE',
      plan: normalizedPlan,
      planPriceId: planPriceId ?? null,
      status: normalizeSubscriptionStatus(status),
      paddleCustomerId: paddleCustomerId ?? null,
      paddleSubscriptionId: paddleSubscriptionId ?? null,
      trialEndsAt: trialEndsAt ?? null,
      currentPeriodEnd: currentPeriodEnd ?? null,
      canceledAt: canceledAt ?? null,
    },
    select: {
      userId: true,
      plan: true,
      planPriceId: true,
      status: true,
      provider: true,
      paddleCustomerId: true,
      paddleSubscriptionId: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      updatedAt: true,
    },
  })

  const mapped = mapPrismaRowToRecord(row)
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
  if (paddleSubscriptionId && paddleSubscriptionId.trim().length > 0) {
    const bySubscription = await prisma.subscription.findFirst({
      where: {
        provider: 'PADDLE',
        paddleSubscriptionId: paddleSubscriptionId.trim(),
      },
      select: {
        userId: true,
        plan: true,
        planPriceId: true,
        status: true,
        provider: true,
        paddleCustomerId: true,
        paddleSubscriptionId: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        updatedAt: true,
      },
    })

    if (bySubscription) {
      return mapPrismaRowToRecord(bySubscription)
    }
  }

  if (paddleCustomerId && paddleCustomerId.trim().length > 0) {
    const byCustomer = await prisma.subscription.findFirst({
      where: {
        provider: 'PADDLE',
        paddleCustomerId: paddleCustomerId.trim(),
      },
      select: {
        userId: true,
        plan: true,
        planPriceId: true,
        status: true,
        provider: true,
        paddleCustomerId: true,
        paddleSubscriptionId: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        updatedAt: true,
      },
    })

    if (byCustomer) {
      return mapPrismaRowToRecord(byCustomer)
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
  const planFromCustomData = normalizePlanForStorage(explicitPlan)
  if (planFromCustomData) {
    return planFromCustomData
  }

  const planFromPriceId = resolvePlanFromPriceId(planPriceId)
  if (planFromPriceId) {
    return planFromPriceId
  }

  return existingSubscription?.plan ?? null
}

export async function ensureShopifyTrialForUser(userId: string): Promise<SubscriptionRecord> {
  const existing = await getSubscriptionForUser(userId)
  if (existing) {
    return existing
  }

  const now = new Date()
  const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  return upsertSubscriptionForUser({
    userId,
    plan: 'basic',
    status: 'trialing',
    trialEndsAt,
  })
}

export async function getShopifyBillingGate(userId: string): Promise<ShopifyBillingGate> {
  const subscription = await getSubscriptionForUser(userId)
  if (!subscription) {
    return {
      allowed: false,
      reason: 'missing_subscription',
      status: null,
      trialEndsAt: null,
    }
  }

  const status = normalizeSubscriptionStatus(subscription.status)
  const trialEndsAt = subscription.trialEndsAt
  const now = new Date()

  if (status === 'active') {
    return {
      allowed: true,
      reason: 'ok',
      status,
      trialEndsAt,
    }
  }

  if (status === 'trialing') {
    if (trialEndsAt && trialEndsAt.getTime() < now.getTime()) {
      return {
        allowed: false,
        reason: 'trial_expired',
        status,
        trialEndsAt,
      }
    }

    return {
      allowed: true,
      reason: 'ok',
      status,
      trialEndsAt,
    }
  }

  return {
    allowed: false,
    reason: 'inactive_subscription',
    status,
    trialEndsAt,
  }
}
