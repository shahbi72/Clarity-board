'use client'

import { DashboardDataProvider, type DashboardPlanType } from '@/components/dashboard/dashboard-data-provider'
import { AppShell } from '@/components/layout/AppShell'

type DashboardWorkspaceProps = {
  children: React.ReactNode
  initialPlanType: DashboardPlanType
  user: {
    name: string
    email: string
    avatarUrl: string | null
  }
}

export function DashboardWorkspace({ children, initialPlanType, user }: DashboardWorkspaceProps) {
  return (
    <DashboardDataProvider initialPlanType={initialPlanType} user={user}>
      <AppShell>{children}</AppShell>
    </DashboardDataProvider>
  )
}
