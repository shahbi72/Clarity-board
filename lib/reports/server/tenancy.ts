import { prisma } from '@/lib/server/prisma'

function normalizeName(input: string): string {
  const base = input.trim() || 'Workspace'
  return base.length > 60 ? base.slice(0, 60) : base
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48)
}

async function uniqueWorkspaceSlug(base: string): Promise<string> {
  const root = slugify(base) || 'workspace'
  const first = await prisma.workspace.findUnique({ where: { slug: root }, select: { id: true } })
  if (!first) {
    return root
  }

  for (let i = 2; i < 1000; i += 1) {
    const next = `${root}-${i}`
    const exists = await prisma.workspace.findUnique({ where: { slug: next }, select: { id: true } })
    if (!exists) {
      return next
    }
  }

  return `${root}-${Date.now()}`
}

export async function getPrimaryWorkspaceId(userId: string): Promise<string | null> {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { workspaceId: true },
  })

  return membership?.workspaceId ?? null
}

export async function ensureWorkspaceForUser(userId: string, displayName: string): Promise<string> {
  const existing = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { workspaceId: true },
  })

  if (existing) {
    return existing.workspaceId
  }

  const workspaceName = normalizeName(displayName.includes(' ') ? `${displayName}'s Workspace` : `${displayName} Workspace`)
  const slug = await uniqueWorkspaceSlug(workspaceName)

  const workspace = await prisma.workspace.create({
    data: {
      name: workspaceName,
      slug,
      ownerId: userId,
      members: {
        create: {
          userId,
          role: 'OWNER',
        },
      },
    },
    select: { id: true },
  })

  return workspace.id
}

export async function ensureTrialSubscription(userId: string, workspaceId: string): Promise<void> {
  const now = new Date()
  const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      workspaceId,
      provider: 'PADDLE',
      status: 'trialing',
      plan: 'basic',
      trialEndsAt,
      canceledAt: null,
    },
    create: {
      userId,
      workspaceId,
      provider: 'PADDLE',
      status: 'trialing',
      plan: 'basic',
      trialEndsAt,
    },
  })
}

export type BillingGate = {
  allowed: boolean
  reason: 'ok' | 'trial_expired' | 'missing_subscription' | 'inactive_subscription'
  trialEndsAt: Date | null
  status: string | null
}

export async function getBillingGate(userId: string): Promise<BillingGate> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      provider: true,
      status: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      canceledAt: true,
    },
  })

  if (!subscription) {
    return {
      allowed: false,
      reason: 'missing_subscription',
      trialEndsAt: null,
      status: null,
    }
  }

  if (subscription.provider !== 'PADDLE') {
    return {
      allowed: false,
      reason: 'missing_subscription',
      trialEndsAt: null,
      status: null,
    }
  }

  const now = new Date()
  const status = (subscription.status ?? '').toLowerCase()
  const trialEndsAt = subscription.trialEndsAt ?? null

  if (status === 'active' || status === 'trialing') {
    if (status === 'trialing' && trialEndsAt && trialEndsAt.getTime() < now.getTime()) {
      return {
        allowed: false,
        reason: 'trial_expired',
        trialEndsAt,
        status,
      }
    }

    return {
      allowed: true,
      reason: 'ok',
      trialEndsAt,
      status,
    }
  }

  return {
    allowed: false,
    reason: 'inactive_subscription',
    trialEndsAt,
    status,
  }
}

