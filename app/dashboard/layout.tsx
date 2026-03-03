import { redirect } from 'next/navigation'
import { getSupabaseServerClient, isSupabaseAuthConfigured } from '@/lib/supabase/server'
import { DashboardWorkspace } from '@/components/layout/DashboardWorkspace'
import type { DashboardPlanType } from '@/components/dashboard/dashboard-data-provider'

type DashboardLayoutProps = {
  children: React.ReactNode
}

function parsePlanTypeFromMetadata(metadata: Record<string, unknown> | null | undefined): DashboardPlanType {
  if (!metadata) {
    return 'starter'
  }

  const candidateKeys = ['plan', 'subscription_plan', 'plan_type', 'tier', 'subscriptionTier']
  const rawValue = candidateKeys
    .map((key) => metadata[key])
    .find((value) => typeof value === 'string') as string | undefined

  const normalized = rawValue?.trim().toLowerCase() ?? ''
  if (
    normalized === 'business' ||
    normalized === 'pro' ||
    normalized === 'growth' ||
    normalized === 'scale'
  ) {
    return 'business'
  }

  return 'starter'
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  if (!isSupabaseAuthConfigured()) {
    return (
      <DashboardWorkspace
        initialPlanType="starter"
        user={{
          name: 'Demo User',
          email: 'demo@clarityboard.app',
          avatarUrl: null,
        }}
      >
        {children}
      </DashboardWorkspace>
    )
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) {
    redirect('/login?next=/dashboard')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/dashboard')
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>
  const planType = parsePlanTypeFromMetadata({
    ...appMetadata,
    ...metadata,
  })

  return (
    <DashboardWorkspace
      initialPlanType={planType}
      user={{
        name:
          (typeof metadata.full_name === 'string' && metadata.full_name) ||
          (typeof metadata.name === 'string' && metadata.name) ||
          user.email ||
          'Clarityboard User',
        email: user.email ?? '',
        avatarUrl: typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null,
      }}
    >
      {children}
    </DashboardWorkspace>
  )
}
