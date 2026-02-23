'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Loader2, RefreshCw, UploadCloud } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { DashboardSummaryResponse } from '@/lib/types/data-pipeline'
import { useActiveDatasetStore } from '@/lib/stores/active-dataset-store'
import { useI18n } from '@/components/language/language-provider'

const IS_DEV = process.env.NODE_ENV !== 'production'

function debugDashboard(event: string, payload: Record<string, unknown>) {
  if (!IS_DEV) return
  console.debug(`[dashboard] ${event}`, payload)
}

export default function DashboardPage() {
  const { t } = useI18n()
  const pathname = usePathname()
  const activeDatasetId = useActiveDatasetStore((state) => state.activeDatasetId)
  const activeDatasetName = useActiveDatasetStore((state) => state.activeDatasetName)
  const setActiveDataset = useActiveDatasetStore((state) => state.setActiveDataset)

  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isMountedRef = useRef(true)
  const requestIdRef = useRef(0)
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const loadSummary = useCallback(
    async (reason: string) => {
      const currentRequestId = ++requestIdRef.current
      const isInitialLoad = !hasFetchedRef.current
      const query =
        activeDatasetId && activeDatasetId.length > 0
          ? `?activeDatasetId=${encodeURIComponent(activeDatasetId)}`
          : ''

      debugDashboard('fetch:start', {
        reason,
        activeDatasetId,
        query,
      })

      setError(null)
      if (isInitialLoad) {
        setIsLoading(true)
      }
      setIsRefreshing(true)

      try {
        const response = await fetch(`/api/dashboard/summary${query}`, { cache: 'no-store' })
        const payload = (await response.json()) as DashboardSummaryResponse | { error?: string }

        if (!response.ok || !('dataset' in payload)) {
          throw new Error(
            payload && typeof payload === 'object' && 'error' in payload
              ? payload.error || 'Failed to load dashboard.'
              : 'Failed to load dashboard.'
          )
        }

        if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
          return
        }

        setSummary(payload)

        const returnedActiveDatasetId = payload.dataset?.id ?? null
        const returnedActiveDatasetName = payload.dataset?.name ?? null

        if (
          returnedActiveDatasetId !== activeDatasetId ||
          returnedActiveDatasetName !== activeDatasetName
        ) {
          setActiveDataset(
            payload.dataset
              ? {
                  id: payload.dataset.id,
                  name: payload.dataset.name,
                }
              : null
          )
        }

        debugDashboard('fetch:end', {
          reason,
          activeDatasetId: returnedActiveDatasetId,
          rowCount: payload.metrics.rowCount,
          transactionCount: payload.recentTransactions.length,
        })
      } catch (fetchError) {
        if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
          return
        }

        const message = fetchError instanceof Error ? fetchError.message : 'Failed to load dashboard.'
        setError(message)
        debugDashboard('fetch:error', {
          reason,
          activeDatasetId,
          message,
        })
      } finally {
        if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
          return
        }

        setIsLoading(false)
        setIsRefreshing(false)
        hasFetchedRef.current = true
      }
    },
    [activeDatasetId, activeDatasetName, setActiveDataset]
  )

  useEffect(() => {
    if (pathname !== '/app/dashboard') return
    void loadSummary('route-or-dataset-change')
  }, [pathname, activeDatasetId, loadSummary])

  useEffect(() => {
    const handleFocus = () => {
      if (pathname !== '/app/dashboard') return
      if (document.visibilityState !== 'visible') return
      void loadSummary('window-focus')
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [pathname, loadSummary])

  const activeDataset = summary?.dataset ?? (
    activeDatasetId
      ? {
          id: activeDatasetId,
          name: activeDatasetName ?? 'Active dataset',
        }
      : null
  )
  const transactions = summary?.recentTransactions ?? []

  return (
    <div className="min-h-full">
      <DashboardHeader
        title={t('dashboard.title')}
        description={t('dashboard.subtitle')}
      />
      <main className="space-y-6 p-4 sm:p-6 lg:p-8">
        {error ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.unavailableTitle')}</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => void loadSummary('retry')}>{t('dashboard.retry')}</Button>
            </CardContent>
          </Card>
        ) : null}

        {!error && isLoading ? (
          <Card>
            <CardContent className="flex min-h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('dashboard.loading')}
            </CardContent>
          </Card>
        ) : null}

        {!error && !isLoading && !activeDataset ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>{t('dashboard.noActiveDatasetTitle')}</CardTitle>
              <CardDescription>{t('dashboard.noActiveDatasetDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/app/upload">
                  <UploadCloud className="mr-2 h-4 w-4" />
                  {t('dashboard.uploadData')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {!error && activeDataset ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* IMPORTANT: this heading is used by e2e assertions */}
              <h1 data-testid="dataset-name" className="text-2xl font-semibold tracking-tight">
                {activeDataset.name}
              </h1>
              <Button
                variant="outline"
                onClick={() => void loadSummary('manual-refresh')}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {t('dashboard.refresh')}
              </Button>
            </div>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">{t('dashboard.recentTransactions')}</h2>
              {transactions.length === 0 ? (
                <Card>
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    {t('dashboard.noTransactions')}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3">{t('dashboard.table.date')}</th>
                            <th className="px-4 py-3">{t('dashboard.table.description')}</th>
                            <th className="px-4 py-3">{t('dashboard.table.category')}</th>
                            <th className="px-4 py-3 text-right">{t('dashboard.table.amount')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((transaction) => (
                            <tr key={transaction.rowIndex} className="border-t border-border/70">
                              <td className="px-4 py-3">{transaction.date ?? '-'}</td>
                              <td className="px-4 py-3">{transaction.description ?? '-'}</td>
                              <td className="px-4 py-3">{transaction.category ?? '-'}</td>
                              <td className="px-4 py-3 text-right">{formatCurrency(transaction.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </section>
          </div>
        ) : null}
      </main>
    </div>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}
