import type { Metadata } from 'next'
import Link from 'next/link'
import { PricingPlans } from '@/components/billing/pricing-plans'
import { PublicHeader } from '@/components/marketing/PublicHeader'
import { Button } from '@/components/ui/button'
import { getCurrentUserIdentity } from '@/lib/server/auth'

export const metadata: Metadata = {
  title: 'Pricing | Clarityboard',
  description:
    'Starter ($25) and Business ($39) plans for Shopify store owners. 7-day free trial via Paddle.',
}

export default async function PricingPage() {
  let userId: string | null = null
  let userEmail: string | null = null

  try {
    const identity = await getCurrentUserIdentity()
    userId = identity.id
    userEmail = identity.email
  } catch {
    userId = null
    userEmail = null
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader activePath="/pricing" />

      <main className="mx-auto w-full max-w-6xl px-4 py-16">
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Pricing</h1>
          <p className="mt-3 text-muted-foreground">
            Shopify Orders CSV clarity tool for small stores.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Starter is $25/month. Business is $39/month with live sync, insight notifications, and unlimited AI Copilot.
          </p>
          <div className="mt-6">
            <Button asChild size="lg">
              <Link href="/signup">Start Free Trial</Link>
            </Button>
          </div>
        </section>

        <PricingPlans userId={userId} userEmail={userEmail} />
      </main>
    </div>
  )
}
