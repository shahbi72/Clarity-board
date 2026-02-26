import Link from 'next/link'
import { ClarityboardLogo } from '@/components/branding/ClarityboardLogo'
import { PricingPlans } from '@/components/billing/pricing-plans'
import { Button } from '@/components/ui/button'
import { getCurrentUserId } from '@/lib/server/auth'

export default async function PricingPage() {
  let userId: string | null = null

  try {
    userId = await getCurrentUserId()
  } catch {
    userId = null
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <ClarityboardLogo href="/" withBackground imageClassName="h-8 w-auto md:h-10" />
          <Button asChild variant="ghost">
            <Link href={userId ? '/billing' : '/login'}>{userId ? 'Billing' : 'Sign in'}</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-16">
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Pricing</h1>
          <p className="mt-3 text-muted-foreground">
            Choose a plan and complete checkout securely with Paddle.
          </p>
        </section>

        <PricingPlans userId={userId} />
      </main>
    </div>
  )
}
