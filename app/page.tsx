import Link from 'next/link'
import { ArrowRight, BarChart3, Boxes, DollarSign } from 'lucide-react'
import { PublicHeader } from '@/components/marketing/PublicHeader'
import { Button } from '@/components/ui/button'

const FEATURES = [
  {
    title: 'Sales analysis',
    description: 'Track revenue, trends, and performance by product or category.',
    icon: BarChart3,
  },
  {
    title: 'Inventory insights',
    description: 'Spot stock pressure early and keep operations in balance.',
    icon: Boxes,
  },
  {
    title: 'Profit optimization',
    description: 'Identify margin leakage and focus on highest-impact actions.',
    icon: DollarSign,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />

      <main className="mx-auto w-full max-w-6xl px-4 py-16 md:py-24">
        <section className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border/70 bg-card px-6 py-16 text-center shadow-sm md:px-10 md:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_20%,transparent),transparent_55%),radial-gradient(circle_at_80%_80%,color-mix(in_oklch,var(--accent)_35%,transparent),transparent_60%),linear-gradient(135deg,color-mix(in_oklch,var(--card)_95%,white),color-mix(in_oklch,var(--card)_88%,var(--primary)_12%))]" />

          <div className="relative z-10 mx-auto max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
              AI analytics for modern teams
            </p>
            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Turn raw data into decisions your team can trust.
            </h1>
            <p className="mt-4 text-balance text-lg text-muted-foreground">
              Clarityboard cleans, structures, and explains your business data in one focused workspace.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/signup">
                  Start free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="bg-card/70"
              >
                <Link href="/pricing">View pricing</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="rounded-xl border border-border/80 bg-card p-5">
              <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                <feature.icon className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold capitalize">{feature.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            </article>
          ))}
        </section>
      </main>

    </div>
  )
}
