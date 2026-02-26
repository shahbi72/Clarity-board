import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicHeader } from '@/components/marketing/PublicHeader'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Refund Policy | Clarityboard',
  description:
    'Review Clarityboard refund terms for first-time subscriptions, renewal exclusions, and support contact details.',
}

export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader activePath="/refunds" />

      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-12">
        <section>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Billing</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Refund Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Clarityboard is a subscription-based SaaS platform for dashboards, analytics, and
            AI-powered business insights.
          </p>
        </section>

        <section className="rounded-xl border border-border/70 bg-card p-6">
          <h2 className="text-xl font-semibold tracking-tight">How Refunds Work</h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
            <ul className="list-disc space-y-2 pl-5">
              <li>Refunds apply to first-time subscription purchases only.</li>
              <li>Requests must be made within 7 days of the initial charge date.</li>
              <li>No refunds are offered for renewals or later billing cycles.</li>
              <li>
                Refunds may be denied if we detect misuse, abuse, or excessive data export
                behavior.
              </li>
            </ul>
            <p>
              To request a refund, contact{' '}
              <a
                href="mailto:clarityboard.app@gmail.com"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                clarityboard.app@gmail.com
              </a>{' '}
              and include your billing email and original charge date.
            </p>
            <p>Full legal billing terms are available in our Terms of Service.</p>
          </div>
          <div className="mt-5">
            <Button asChild>
              <Link href="/terms#refund-policy">Read Refund Terms in Terms of Service</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
