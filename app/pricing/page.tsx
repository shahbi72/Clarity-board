import type { Metadata } from 'next'
import Link from 'next/link'
import { PricingPlans } from '@/components/billing/pricing-plans'
import { PublicHeader } from '@/components/marketing/PublicHeader'
import { Button } from '@/components/ui/button'
import { getCurrentUserId } from '@/lib/server/auth'

export const metadata: Metadata = {
  title: 'Pricing | Clarityboard',
  description:
    'Compare Clarityboard Starter, Pro, and Business plans for SaaS analytics and AI insights subscriptions.',
}

export default async function PricingPage() {
  let userId: string | null = null

  try {
    userId = await getCurrentUserId()
  } catch {
    userId = null
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader activePath="/pricing" />

      <main className="mx-auto w-full max-w-6xl px-4 py-16">
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Pricing</h1>
          <p className="mt-3 text-muted-foreground">
            Clarityboard sells subscription access to analytics dashboards and AI-generated business
            insights. Choose the plan that fits your reporting and decision workflow.
          </p>
          <div className="mt-6">
            <Button asChild size="lg">
              <Link href="/signup">Start free</Link>
            </Button>
          </div>
        </section>

        <PricingPlans userId={userId} />
      </main>
    </div>
  )
}
