import Link from 'next/link'
import { ArrowRight, BarChart3, Boxes, DollarSign } from 'lucide-react'
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
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Clarityboard
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Start free</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-16 md:py-24">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
            Clarityboard
          </h1>
          <p className="mt-4 text-balance text-lg text-muted-foreground">
            AI-powered business intelligence for decisions, not dashboards.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/signup">
                Start free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/pricing">View pricing</Link>
            </Button>
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

      <footer className="border-t border-border/70">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 text-sm text-muted-foreground">
          <span>Copyright {new Date().getFullYear()} Clarityboard</span>
          <Link href="/privacy-policy" className="hover:text-foreground">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  )
}
