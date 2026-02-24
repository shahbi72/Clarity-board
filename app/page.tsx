import Link from 'next/link'
import { ArrowRight, BarChart3, Boxes, DollarSign } from 'lucide-react'
import { ClarityboardLogo } from '@/components/branding/ClarityboardLogo'
import { LiveBackground } from '@/components/marketing/LiveBackground'
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
          <ClarityboardLogo
            href="/"
            priority
            withBackground
            imageClassName="h-8 w-auto md:h-10"
          />
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
        <section className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border/70 bg-card/40 px-6 py-16 text-center shadow-sm md:px-10 md:py-20">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_10%,rgba(28,59,122,0.96),transparent_58%),radial-gradient(circle_at_80%_30%,rgba(80,130,216,0.38),transparent_56%),linear-gradient(135deg,rgba(7,20,44,0.96)_0%,rgba(9,26,58,0.94)_50%,rgba(8,18,36,0.96)_100%)]" />
          <LiveBackground className="z-[1]" />
          <div
            className="pointer-events-none absolute inset-0 z-[2]"
            style={{
              background:
                'radial-gradient(circle at 50% 42%, rgba(8, 22, 50, 0.14) 0%, rgba(8, 22, 50, 0.1) 36%, rgba(8, 20, 42, 0.28) 72%, rgba(6, 14, 30, 0.44) 100%)',
            }}
          />

          <div className="relative z-10 mx-auto max-w-3xl">
            <div className="mb-6 flex justify-center">
              <ClarityboardLogo
                href="/"
                withBackground
                imageClassName="h-9 w-auto md:h-10"
              />
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
              Clarityboard
            </h1>
            <p className="mt-4 text-balance text-lg text-slate-200">
              AI-powered business intelligence for decisions, not dashboards.
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
                className="border-slate-200/50 bg-slate-900/20 text-slate-100 hover:bg-slate-900/35"
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

      <footer className="border-t border-border/70">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <ClarityboardLogo
              href="/"
              withBackground
              imageClassName="h-7 w-auto md:h-8"
            />
            <span>Copyright {new Date().getFullYear()} Clarityboard</span>
          </div>
          <Link href="/privacy-policy" className="hover:text-foreground">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  )
}
