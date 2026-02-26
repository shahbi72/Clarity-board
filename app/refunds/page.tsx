import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicHeader } from '@/components/marketing/PublicHeader'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Refund Policy | Clarityboard',
  description:
    'Review Clarityboard subscription refund terms, including first-time purchase eligibility and renewal conditions.',
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
            Clarityboard offers a 14-day refund for first-time subscription purchases. Refunds are
            not available for renewal charges after the initial billing period.
          </p>
        </section>

        <section className="rounded-xl border border-border/70 bg-card p-6">
          <h2 className="text-xl font-semibold tracking-tight">How Refunds Work</h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
            <p>
              To request a refund, contact clarityboard.app@gmail.com with your billing email and
              purchase date. Approved refunds are processed to the original payment method.
            </p>
            <p>
              For charge disputes or exceptional account circumstances, contact support and we will
              review the case promptly.
            </p>
            <p>
              Full legal billing terms are available in our Terms of Service under the refund
              section.
            </p>
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
