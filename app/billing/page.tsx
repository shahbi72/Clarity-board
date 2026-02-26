import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ClarityboardLogo } from '@/components/branding/ClarityboardLogo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentUserId } from '@/lib/server/auth'
import { getSubscriptionForUser, isActiveSubscriptionStatus } from '@/lib/server/subscriptions'

function toTitleCase(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ')
}

function formatPlanName(planPriceId: string | null): string {
  if (!planPriceId) {
    return 'Free'
  }

  const planEntries: Array<[string, string]> = [
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER_ID?.trim() ?? '', 'Starter'],
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_GROWTH_ID?.trim() ?? '', 'Pro'],
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_SCALE_ID?.trim() ?? '', 'Business'],
  ]

  const planMap = new Map<string, string>(
    planEntries.filter(([priceId]) => priceId.length > 0)
  )

  return planMap.get(planPriceId) ?? planPriceId
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
  const isActive = isActiveSubscriptionStatus(status)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4">
          <ClarityboardLogo href="/" withBackground imageClassName="h-8 w-auto md:h-10" />
          <Button asChild variant="ghost">
            <Link href="/app/dashboard">Dashboard</Link>
          </Button>
        </div>
      </header>

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
              <p className="mt-1 text-xl font-semibold">{formatPlanName(subscription?.planPriceId ?? null)}</p>
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
              <Button asChild variant="outline">
                <Link href="/app/ai-assistant">Open AI Assistant</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
