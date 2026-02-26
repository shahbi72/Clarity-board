import type { Metadata } from 'next'
import { PublicHeader } from '@/components/marketing/PublicHeader'

export const metadata: Metadata = {
  title: 'Contact Support | Clarityboard',
  description:
    'Contact Clarityboard support for subscription, billing, privacy, or technical questions.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader activePath="/contact" />

      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-12">
        <section>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Support</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Contact Clarityboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            If you need help with account setup, billing, data privacy, or feature questions, our
            support team is available by email.
          </p>
        </section>

        <section className="rounded-xl border border-border/70 bg-card p-6">
          <h2 className="text-xl font-semibold tracking-tight">Support Email</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Email us at{' '}
            <a
              href="mailto:clarityboard.app@gmail.com"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              clarityboard.app@gmail.com
            </a>{' '}
            and include your account email plus a short description of the issue. We typically
            respond within two business days.
          </p>
        </section>
      </main>
    </div>
  )
}
