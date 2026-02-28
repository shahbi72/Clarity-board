import { ApiError } from '@/lib/reports/server/api-error'
import { getReportsSession } from '@/lib/reports/auth/options'
import { ensureTrialSubscription, ensureWorkspaceForUser } from '@/lib/reports/server/tenancy'
import { prisma } from '@/lib/server/prisma'

export type ReportsAuthContext = {
  userId: string
  workspaceId: string
  userEmail: string | null
}

async function buildDemoAuthContext(): Promise<ReportsAuthContext> {
  const demoUserId = process.env.REPORTS_DEMO_USER_ID?.trim() || 'reports-demo-user'
  const demoEmail = process.env.REPORTS_DEMO_USER_EMAIL?.trim() || 'demo@clarityboard.local'

  await prisma.user.upsert({
    where: { id: demoUserId },
    update: {
      email: demoEmail,
      name: 'Reports Demo User',
    },
    create: {
      id: demoUserId,
      email: demoEmail,
      name: 'Reports Demo User',
    },
  })

  const workspaceId = await ensureWorkspaceForUser(demoUserId, 'Reports Demo')
  await ensureTrialSubscription(demoUserId, workspaceId)

  return {
    userId: demoUserId,
    workspaceId,
    userEmail: demoEmail,
  }
}

export async function requireReportsAuthContext(): Promise<ReportsAuthContext> {
  if (process.env.REPORTS_DEMO_AUTH === '1') {
    return buildDemoAuthContext()
  }

  const session = await getReportsSession()

  if (!session?.user?.id) {
    throw new ApiError(401, 'unauthenticated', 'Authentication required.')
  }

  const workspaceId = session.user.workspaceId ?? (await ensureWorkspaceForUser(session.user.id, session.user.name ?? 'Workspace'))

  return {
    userId: session.user.id,
    workspaceId,
    userEmail: session.user.email ?? null,
  }
}

