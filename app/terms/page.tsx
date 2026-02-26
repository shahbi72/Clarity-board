import type { Metadata } from 'next'
import { PublicHeader } from '@/components/marketing/PublicHeader'

export const metadata: Metadata = {
  title: 'Terms of Service | Clarityboard',
  description:
    'Read Clarityboard terms for its subscription-based SaaS analytics and AI insights platform, including acceptable use, service limits, and refund terms.',
}

function Section({
  id,
  title,
  children,
}: {
  id?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="rounded-xl border border-border/70 bg-card p-6">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">{children}</div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader activePath="/terms" />

      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-12">
        <section>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Legal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Effective February 26, 2026. Clarityboard is a subscription-based SaaS platform for
            dashboards, analytics, and AI-powered business insights.
          </p>
        </section>

        <Section title="Service Overview">
          <p>
            Clarityboard provides hosted software tools for dataset ingestion, dashboard analytics,
            and AI-generated recommendations. Access is sold as recurring subscriptions by plan
            tier.
          </p>
        </Section>

        <Section title="Accounts, Billing, and Renewals">
          <p>
            Paid plans are billed in advance on the selected billing cycle through Paddle. By
            purchasing a subscription, you authorize recurring charges until canceled. You are
            responsible for keeping payment details current.
          </p>
          <p>
            Plan features and usage limits vary by tier. If usage exceeds plan limits, access to
            specific features may be limited until upgrade or renewal.
          </p>
        </Section>

        <Section id="refund-policy" title="Refund Policy">
          <ul className="list-disc space-y-2 pl-5">
            <li>Refunds are available only for first-time subscription purchases.</li>
            <li>Refund requests must be submitted within 7 days of the initial charge.</li>
            <li>No refunds are provided for renewals or subsequent billing cycles.</li>
            <li>
              Refunds may be denied in cases of misuse, abuse, or excessive data export activity.
            </li>
          </ul>
          <p>For refund requests or billing disputes, contact clarityboard.app@gmail.com.</p>
        </Section>

        <Section title="Acceptable Use">
          <p>
            You may not use Clarityboard to process unlawful content, violate privacy or
            intellectual property rights, interfere with service security, or attempt unauthorized
            access to accounts, infrastructure, or data.
          </p>
          <p>
            We may suspend or terminate accounts engaged in abusive, fraudulent, or harmful use.
          </p>
        </Section>

        <Section title="Service Limitations">
          <p>
            Clarityboard is provided on an as-available basis. We work to maintain reliability and
            accuracy, but do not guarantee uninterrupted service, error-free outputs, or specific
            business outcomes.
          </p>
          <p>
            AI insight features may produce probabilistic recommendations and should be reviewed
            before operational or financial decisions.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            For legal or billing inquiries, email clarityboard.app@gmail.com. We typically respond
            within two business days.
          </p>
        </Section>
      </main>
    </div>
  )
}
