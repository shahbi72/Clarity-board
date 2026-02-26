import type { Metadata } from 'next'
import { PublicHeader } from '@/components/marketing/PublicHeader'

export const metadata: Metadata = {
  title: 'Privacy Policy | Clarityboard',
  description:
    'Understand what data Clarityboard collects, how cookies and analytics are used, and how to request account or data deletion for its SaaS analytics platform.',
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border/70 bg-card p-6">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader activePath="/privacy" />

      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-12">
        <section>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Legal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Effective February 26, 2026. Clarityboard is a subscription-based SaaS platform for
            dashboards, analytics, and AI-powered business insights.
          </p>
        </section>

        <Section title="Data We Collect">
          <p>
            We collect account information (name, email, company details), billing metadata from
            Paddle, uploaded dataset content, usage logs, and support communications.
          </p>
          <p>
            We also collect technical telemetry such as browser type, device identifiers, and
            feature usage to keep the platform secure and reliable.
          </p>
        </Section>

        <Section title="How We Use Data">
          <p>
            We use data to provide dashboard analytics, generate AI insights, process payments,
            improve product performance, prevent abuse, and communicate service updates.
          </p>
        </Section>

        <Section title="Cookies and Analytics">
          <p>
            Clarityboard uses cookies and similar technologies for login sessions, security, and
            basic analytics. You can control cookie behavior through browser settings, though some
            functionality may be limited if cookies are disabled.
          </p>
        </Section>

        <Section title="Sharing and Retention">
          <p>
            We do not sell personal data. We share data only with service providers that operate
            infrastructure, payments, and support tooling. Data is retained only as long as needed
            for service delivery, legal obligations, and legitimate security purposes.
          </p>
        </Section>

        <Section title="Your Rights and Deletion Requests">
          <p>
            You may request access, correction, export, or deletion of account data by emailing
            clarityboard.app@gmail.com. We process valid requests within a reasonable timeframe.
          </p>
        </Section>
      </main>
    </div>
  )
}
