import type { Subscription } from '@prisma/client'
import { getCurrentUserId } from '@/lib/server/auth'
import { HttpError } from '@/lib/server/http-error'
import { prisma } from '@/lib/server/prisma'

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active'])

type UpsertSubscriptionInput = {
  userId: string
  status: string
  paddleCustomerId?: string | null
  paddleSubscriptionId?: string | null
  planPriceId?: string | null
  currentPeriodEnd?: Date | null
}

function normalizeStatus(value: string): string {
  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 ? normalized : 'inactive'
}

export function isActiveSubscriptionStatus(status: string | null | undefined): boolean {
  if (!status) {
    return false
  }

  return ACTIVE_SUBSCRIPTION_STATUSES.has(status.trim().toLowerCase())
}

export function mapPaddleTransactionStatus(status: string | null | undefined): string {
  const normalized = status?.trim().toLowerCase() ?? ''

  switch (normalized) {
    case 'completed':
    case 'paid':
    case 'billed':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'refunded':
      return 'refunded'
    case 'cancelled':
    case 'canceled':
      return 'canceled'
    default:
      return normalized.length > 0 ? normalized : 'inactive'
  }
}

export function parsePaddleDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export async function getSubscriptionForUser(userId: string): Promise<Subscription | null> {
  return prisma.subscription.findUnique({
    where: { userId },
  })
}

export async function getCurrentUserSubscription(): Promise<Subscription | null> {
  const userId = await getCurrentUserId()
  return getSubscriptionForUser(userId)
}

export async function requireActiveSubscriptionForUser(userId: string): Promise<Subscription> {
  const subscription = await getSubscriptionForUser(userId)

  if (!subscription || !isActiveSubscriptionStatus(subscription.status)) {
    throw new HttpError(402, 'Active subscription required.')
  }

  return subscription
}

export async function requireActiveSubscriptionForCurrentUser(): Promise<Subscription> {
  const userId = await getCurrentUserId()
  return requireActiveSubscriptionForUser(userId)
}

export async function upsertSubscriptionForUser({
  userId,
  status,
  paddleCustomerId,
  paddleSubscriptionId,
  planPriceId,
  currentPeriodEnd,
}: UpsertSubscriptionInput): Promise<Subscription> {
  const normalizedStatus = normalizeStatus(status)

  return prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      status: normalizedStatus,
      paddleCustomerId: paddleCustomerId ?? null,
      paddleSubscriptionId: paddleSubscriptionId ?? null,
      planPriceId: planPriceId ?? null,
      currentPeriodEnd: currentPeriodEnd ?? null,
    },
    update: {
      status: normalizedStatus,
      ...(paddleCustomerId !== undefined ? { paddleCustomerId } : {}),
      ...(paddleSubscriptionId !== undefined ? { paddleSubscriptionId } : {}),
      ...(planPriceId !== undefined ? { planPriceId } : {}),
      ...(currentPeriodEnd !== undefined ? { currentPeriodEnd } : {}),
    },
  })
}

export async function findSubscriptionByPaddleIdentifiers({
  paddleCustomerId,
  paddleSubscriptionId,
}: {
  paddleCustomerId?: string | null
  paddleSubscriptionId?: string | null
}): Promise<Subscription | null> {
  const lookupClauses: Array<{ paddleCustomerId?: string; paddleSubscriptionId?: string }> = []

  if (paddleCustomerId && paddleCustomerId.trim().length > 0) {
    lookupClauses.push({ paddleCustomerId: paddleCustomerId.trim() })
  }

  if (paddleSubscriptionId && paddleSubscriptionId.trim().length > 0) {
    lookupClauses.push({ paddleSubscriptionId: paddleSubscriptionId.trim() })
  }

  if (lookupClauses.length === 0) {
    return null
  }

  return prisma.subscription.findFirst({
    where: {
      OR: lookupClauses,
    },
  })
}
