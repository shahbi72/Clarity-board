'use client'

import { useEffect, useState } from 'react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'

type ActiveDataset = {
  id: string
  name: string
}

type Summary = {
  dataset?: ActiveDataset | null
  activeDataset?: ActiveDataset | null
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    fetch('/api/dashboard/summary', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: Summary | { error?: string }) => {
        if (!isMounted) return
        if (data && typeof data === 'object' && 'error' in data && data.error) {
          throw new Error(data.error)
        }
        setSummary(data as Summary)
      })
      .catch((fetchError: unknown) => {
        if (!isMounted) return
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load dashboard.')
      })

    return () => {
      isMounted = false
    }
  }, [])

  const activeDataset = summary?.activeDataset ?? summary?.dataset ?? null

  return (
    <div className="min-h-full">
      <DashboardHeader
        title="Dashboard"
        description="Monitor your active dataset and latest activity"
      />
      <main className="space-y-6 p-4 sm:p-6 lg:p-8">
        {error ? <div>{error}</div> : null}
        {!error && !summary ? <div>Loading...</div> : null}
        {!error && summary && !activeDataset ? <h1>No Active Dataset</h1> : null}

        {!error && activeDataset ? (
          <div className="space-y-6">
            {/* IMPORTANT: this heading is used by e2e assertions */}
            <h1 data-testid="dataset-name" className="text-2xl font-semibold tracking-tight">
              {activeDataset.name}
            </h1>

            <section>
              <h2 className="text-lg font-semibold">Recent Transactions</h2>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  )
}
