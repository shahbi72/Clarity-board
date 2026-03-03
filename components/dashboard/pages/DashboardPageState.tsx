'use client'

import Link from 'next/link'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useDashboardData } from '@/components/dashboard/dashboard-data-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type DashboardPageStateProps = {
  children: React.ReactNode
}

const CARD_CLASS = 'bg-white rounded-2xl shadow-sm border border-[#d9e1ef]'

export function DashboardPageState({ children }: DashboardPageStateProps) {
  const { viewState, summary } = useDashboardData()

  if (viewState.loading) {
    return (
      <Card className={CARD_CLASS}>
        <CardContent className="flex min-h-44 items-center justify-center text-[#6b7a99]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading dashboard...
        </CardContent>
      </Card>
    )
  }

  if (viewState.error) {
    return (
      <Card className={`${CARD_CLASS} border-[#ef4444]/40 bg-[#ef4444]/5`}>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-[#ef4444]">
            <AlertCircle className="h-4 w-4" />
            Dashboard unavailable
          </CardTitle>
          <CardDescription className="text-[#ef4444]/90">{viewState.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (viewState.paywalled) {
    return (
      <Card className={`${CARD_CLASS} border-[#f59e0b]/50 bg-[#f59e0b]/10`}>
        <CardHeader>
          <CardTitle className="text-[#1b2540]">Trial expired</CardTitle>
          <CardDescription className="text-[#6b7a99]">
            Subscribe to keep using dashboard, AI Copilot, and sync features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="bg-[#4285f4] hover:bg-[#4285f4]/90">
            <Link href="/pricing">View plans</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!summary || !summary.hasData) {
    return (
      <Card className={CARD_CLASS}>
        <CardHeader>
          <CardTitle className="text-[#1b2540]">No Shopify data yet</CardTitle>
          <CardDescription className="text-[#6b7a99]">
            Upload a Shopify Orders CSV to view your metrics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="bg-[#4285f4] hover:bg-[#4285f4]/90">
            <Link href="/upload">Upload Shopify Orders CSV</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}
