import Link from 'next/link'
import { Check } from 'lucide-react'
import { ClarityboardLogo } from '@/components/branding/ClarityboardLogo'
import { Button } from '@/components/ui/button'

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    description: 'For getting started with your first datasets.',
    features: [
      'Upload dataset',
      'Basic dashboard',
      'Limited AI assistant usage',
    ],
  },
  {
    name: 'Pro',
    price: '$29',
    description: 'For teams that need deeper insights and automation.',
    features: [
      'Unlimited datasets',
      'Alerts and monitoring',
      'Advanced insights',
    ],
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <ClarityboardLogo href="/" withBackground imageClassName="h-8 w-auto md:h-10" />
          <Button asChild variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-16">
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Pricing</h1>
          <p className="mt-3 text-muted-foreground">
            Start free, then upgrade when your data workflow grows.
          </p>
        </section>

        <section className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
          {TIERS.map((tier) => (
            <article key={tier.name} className="rounded-xl border border-border/80 bg-card p-6">
              <h2 className="text-xl font-semibold">{tier.name}</h2>
              <p className="mt-1 text-3xl font-semibold">{tier.price}</p>
              <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
              <ul className="mt-5 space-y-2">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <div className="mt-10 text-center">
          <Button asChild size="lg">
            <Link href="/signup">Start free</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
