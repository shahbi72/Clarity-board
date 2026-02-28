'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, PlayCircle } from 'lucide-react'
import { PublicHeader } from '@/components/marketing/PublicHeader'
import { ShopifyUploadCard } from '@/components/shopify/shopify-upload-card'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />

      <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1.1fr_1fr] lg:py-16">
        <section className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Shopify-only MVP
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
            Upload your Shopify Orders export. Instantly see what&apos;s making you money.
          </h1>
          <p className="text-balance text-lg text-muted-foreground">
            Built for Shopify store owners. No setup maze, no generic BI complexity.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/dashboard?demo=1">
                <PlayCircle className="mr-2 h-4 w-4" />
                Try Demo Data
              </Link>
            </Button>
          </div>
        </section>

        <section>
          <ShopifyUploadCard
            onUploaded={() => {
              router.push('/dashboard')
            }}
          />
        </section>
      </main>
    </div>
  )
}
