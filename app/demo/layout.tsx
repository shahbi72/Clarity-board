import { DashboardWorkspace } from '@/components/layout/DashboardWorkspace'

type DemoLayoutProps = {
  children: React.ReactNode
}

export default function DemoLayout({ children }: DemoLayoutProps) {
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
