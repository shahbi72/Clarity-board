import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PublicHeader } from '@/components/marketing/PublicHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentUserId } from '@/lib/server/auth'
import {
  getSubscriptionForUser,
  isSubscriptionActiveStatus,
  resolveEffectivePlan,
} from '@/lib/server/subscriptions'
import { toPlanLabel } from '@/lib/billing/plans'

function toTitleCase(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ')
}

function formatPeriodEnd(value: Date | null): string {
  if (!value) {
    return 'n/a'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(value)
}

export default async function BillingPage() {
  let userId: string

  try {
    userId = await getCurrentUserId()
  } catch {
    redirect('/login?next=/billing')
  }

  const subscription = await getSubscriptionForUser(userId)
  const status = subscription?.status ?? 'inactive'
  const isActive = isSubscriptionActiveStatus(status)
  const effectivePlan = resolveEffectivePlan(subscription)
  const managementPortalUrl = process.env.NEXT_PUBLIC_PADDLE_MANAGEMENT_URL?.trim() ?? ''

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />

      <main className="mx-auto w-full max-w-4xl px-4 py-12">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Billing</CardTitle>
                <CardDescription>Current subscription and premium access status.</CardDescription>
              </div>
              <Badge variant={isActive ? 'default' : 'secondary'}>{toTitleCase(status)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/70 p-4">
              <p className="text-sm text-muted-foreground">Current plan</p>
              <p className="mt-1 text-xl font-semibold">{toPlanLabel(effectivePlan)}</p>
            </div>
            <div className="rounded-lg border border-border/70 p-4">
              <p className="text-sm text-muted-foreground">Current period end</p>
              <p className="mt-1 text-xl font-semibold">
                {formatPeriodEnd(subscription?.currentPeriodEnd ?? null)}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild>
                <Link href="/pricing">Manage subscription</Link>
              </Button>
              {managementPortalUrl ? (
                <Button asChild variant="outline">
                  <a href={managementPortalUrl} target="_blank" rel="noreferrer">
                    Open Paddle Customer Portal
                  </a>
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <a href="mailto:clarityboard.app@gmail.com">Contact support for billing changes</a>
                </Button>
              )}
              <Button asChild variant="outline">
                <Link href="/pricing?upgrade=business">Upgrade to Business</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
