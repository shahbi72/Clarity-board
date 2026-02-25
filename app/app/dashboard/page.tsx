'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  ArrowLeftRight,
  DollarSign,
  Loader2,
  ReceiptText,
  RefreshCw,
  TrendingUp,
  UploadCloud,
  Wallet,
} from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { KpiCard } from '@/components/dashboard/KpiCard'
import {
  FiltersPanel,
  type DashboardDateRange,
  type DashboardFilterState,
} from '@/components/dashboard/FiltersPanel'
import { RecentTransactionsTable } from '@/components/dashboard/RecentTransactionsTable'
import { CategoryBreakdownDonutChart } from '@/components/dashboard/charts/CategoryBreakdownDonutChart'
import { RevenueExpensesLineChart } from '@/components/dashboard/charts/RevenueExpensesLineChart'
import { TopCategoriesBarChart } from '@/components/dashboard/charts/TopCategoriesBarChart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/components/language/language-provider'
import { useActiveDatasetStore } from '@/lib/stores/active-dataset-store'
import type {
  DashboardBreakdownPoint,
  DashboardRecentTransaction,
  DashboardSeriesPoint,
  DashboardSummaryResponse,
  DatasetListItem,
  DatasetsResponse,
} from '@/lib/types/data-pipeline'

const IS_DEV = process.env.NODE_ENV !== 'production'

function debugDashboard(event: string, payload: Record<string, unknown>) {
  if (!IS_DEV) return
  console.debug(`[dashboard] ${event}`, payload)
}

const DEFAULT_FILTERS: DashboardFilterState = {
  dateRange: '90',
  category: 'all',
  minAmount: '',
  maxAmount: '',
  search: '',
  datasetId: '',
  customFrom: '',
  customTo: '',
}

type DateWindow = {
  from: Date | null
  to: Date | null
}

function toDateWindow(
  dateRange: DashboardDateRange,
  customFrom: string,
  customTo: string
): DateWindow {
  const end = new Date()
  end.setHours(23, 59, 59, 999)

  if (dateRange === 'custom') {
    const from = customFrom ? new Date(`${customFrom}T00:00:00`) : null
    const to = customTo ? new Date(`${customTo}T23:59:59`) : null

    return {
      from: from && !Number.isNaN(from.getTime()) ? from : null,
      to: to && !Number.isNaN(to.getTime()) ? to : null,
    }
  }

  const dayOffsets: Record<Exclude<DashboardDateRange, 'custom'>, number> = {
    '7': 6,
    '30': 29,
    '90': 89,
  }

  const from = new Date(end)
  from.setDate(end.getDate() - dayOffsets[dateRange])
  from.setHours(0, 0, 0, 0)

  return { from, to: end }
}

function parseTransactionDate(value: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseMonthLabelDate(label: string): Date | null {
  const parsed = new Date(`${label} 1`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function toPercentageChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

function aggregateCategoryTotals(
  transactions: DashboardRecentTransaction[]
): DashboardBreakdownPoint[] {
  const categoryMap = new Map<string, number>()

  for (const transaction of transactions) {
    const category = transaction.category?.trim() || 'Uncategorized'
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + Math.abs(transaction.amount))
  }

  return Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export default function DashboardPage() {
  const { t } = useI18n()
  const pathname = usePathname()
  const activeDatasetId = useActiveDatasetStore((state) => state.activeDatasetId)
  const activeDatasetName = useActiveDatasetStore((state) => state.activeDatasetName)
  const setActiveDataset = useActiveDatasetStore((state) => state.setActiveDataset)

  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null)
  const [datasets, setDatasets] = useState<DatasetListItem[]>([])
  const [filters, setFilters] = useState<DashboardFilterState>(DEFAULT_FILTERS)
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
      const selectedDatasetId = filters.datasetId || activeDatasetId
      const query =
        selectedDatasetId && selectedDatasetId.length > 0
          ? `?activeDatasetId=${encodeURIComponent(selectedDatasetId)}`
          : ''

      debugDashboard('fetch:start', {
        reason,
        selectedDatasetId,
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

        const returnedDatasetId = payload.dataset?.id ?? null
        const returnedDatasetName = payload.dataset?.name ?? null
        if (returnedDatasetId !== activeDatasetId || returnedDatasetName !== activeDatasetName) {
          setActiveDataset(
            payload.dataset
              ? {
                  id: payload.dataset.id,
                  name: payload.dataset.name,
                }
              : null
          )
        }
      } catch (fetchError) {
        if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
          return
        }
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load dashboard.')
      } finally {
        if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
          return
        }
        setIsLoading(false)
        setIsRefreshing(false)
        hasFetchedRef.current = true
      }
    },
    [activeDatasetId, activeDatasetName, filters.datasetId, setActiveDataset]
  )

  const loadDatasets = useCallback(async () => {
    try {
      const response = await fetch('/api/datasets', { cache: 'no-store' })
      const payload = (await response.json()) as DatasetsResponse | { error?: string }
      if (!response.ok || !('datasets' in payload)) {
        return
      }

      setDatasets(payload.datasets)
    } catch {
      // Keep dashboard usable even if datasets fetch fails.
    }
  }, [])

  useEffect(() => {
    if (pathname !== '/app/dashboard') return
    void loadSummary('route-or-dataset-change')
  }, [pathname, activeDatasetId, filters.datasetId, loadSummary])

  useEffect(() => {
    void loadDatasets()
  }, [loadDatasets])

  useEffect(() => {
    if (!filters.datasetId) return
    const selectedDataset = datasets.find((dataset) => dataset.id === filters.datasetId)
    if (!selectedDataset) return

    if (selectedDataset.id !== activeDatasetId || selectedDataset.name !== activeDatasetName) {
      setActiveDataset({
        id: selectedDataset.id,
        name: selectedDataset.name,
      })
    }
  }, [activeDatasetId, activeDatasetName, datasets, filters.datasetId, setActiveDataset])

  const allTransactions = useMemo(
    () => summary?.recentTransactions ?? [],
    [summary?.recentTransactions]
  )
  const dateWindow = useMemo(
    () => toDateWindow(filters.dateRange, filters.customFrom, filters.customTo),
    [filters.customFrom, filters.customTo, filters.dateRange]
  )

  const filteredTransactions = useMemo(() => {
    const minAmount = Number(filters.minAmount)
    const maxAmount = Number(filters.maxAmount)
    const hasMin = filters.minAmount.trim().length > 0 && Number.isFinite(minAmount)
    const hasMax = filters.maxAmount.trim().length > 0 && Number.isFinite(maxAmount)
    const normalizedSearch = filters.search.trim().toLowerCase()

    return allTransactions.filter((transaction) => {
      if (filters.category !== 'all' && transaction.category !== filters.category) {
        return false
      }

      const absoluteAmount = Math.abs(transaction.amount)
      if (hasMin && absoluteAmount < minAmount) return false
      if (hasMax && absoluteAmount > maxAmount) return false

      if (normalizedSearch) {
        const description = transaction.description?.toLowerCase() ?? ''
        if (!description.includes(normalizedSearch)) {
          return false
        }
      }

      if (dateWindow.from || dateWindow.to) {
        const parsedDate = parseTransactionDate(transaction.date)
        if (!parsedDate) return false
        if (dateWindow.from && parsedDate < dateWindow.from) return false
        if (dateWindow.to && parsedDate > dateWindow.to) return false
      }

      return true
    })
  }, [
    allTransactions,
    dateWindow.from,
    dateWindow.to,
    filters.category,
    filters.maxAmount,
    filters.minAmount,
    filters.search,
  ])

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          allTransactions
            .map((transaction) => transaction.category)
            .filter((category): category is string => Boolean(category && category.trim()))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [allTransactions]
  )

  const lineSeries = useMemo(() => {
    const source = summary?.charts.monthlySeries ?? []
    if (!source.length) return []

    if (!dateWindow.from && !dateWindow.to) return source

    return source.filter((point) => {
      const parsed = parseMonthLabelDate(point.label)
      if (!parsed) return false
      if (dateWindow.from && parsed < dateWindow.from) return false
      if (dateWindow.to && parsed > dateWindow.to) return false
      return true
    })
  }, [dateWindow.from, dateWindow.to, summary?.charts.monthlySeries])

  const aggregatedCategories = useMemo(
    () => aggregateCategoryTotals(filteredTransactions),
    [filteredTransactions]
  )

  const barData = useMemo(
    () =>
      aggregatedCategories.length
        ? aggregatedCategories.slice(0, 6)
        : (summary?.charts.topItems ?? []).slice(0, 6),
    [aggregatedCategories, summary?.charts.topItems]
  )

  const donutData = useMemo(
    () =>
      aggregatedCategories.length
        ? aggregatedCategories.slice(0, 6)
        : (summary?.charts.expenseBreakdown ?? []).slice(0, 6),
    [aggregatedCategories, summary?.charts.expenseBreakdown]
  )

  const kpiSnapshot = useMemo(() => {
    const fallbackRevenue = summary?.metrics.totalRevenue ?? 0
    const fallbackExpenses = summary?.metrics.totalExpenses ?? 0
    const fallbackProfit = summary?.metrics.netProfit ?? 0

    const revenue = filteredTransactions.length
      ? filteredTransactions.reduce(
          (sum, transaction) =>
            sum +
            (transaction.revenue > 0
              ? transaction.revenue
              : transaction.type === 'revenue'
                ? Math.max(transaction.amount, 0)
                : 0),
          0
        )
      : fallbackRevenue

    const expenses = filteredTransactions.length
      ? filteredTransactions.reduce(
          (sum, transaction) =>
            sum +
            (transaction.expense > 0
              ? transaction.expense
              : transaction.type === 'expense'
                ? Math.abs(transaction.amount)
                : 0),
          0
        )
      : fallbackExpenses

    const profit = filteredTransactions.length ? revenue - expenses : fallbackProfit

    const transactionsCount = filteredTransactions.length || summary?.metrics.rowCount || 0
    const avgAmount =
      transactionsCount > 0
        ? filteredTransactions.length
          ? filteredTransactions.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0) /
            filteredTransactions.length
          : (Math.abs(fallbackRevenue) + Math.abs(fallbackExpenses)) / transactionsCount
        : 0

    const lastPoint = lineSeries[lineSeries.length - 1] ?? null
    const previousPoint = lineSeries[lineSeries.length - 2] ?? null
    const currentProfit = lastPoint ? lastPoint.revenue - lastPoint.expenses : 0
    const previousProfit = previousPoint ? previousPoint.revenue - previousPoint.expenses : 0
    const momChange =
      lastPoint && previousPoint ? toPercentageChange(currentProfit, previousProfit) : null

    return {
      revenue,
      expenses,
      profit,
      transactionsCount,
      avgAmount,
      momChange,
    }
  }, [filteredTransactions, lineSeries, summary?.metrics])

  const datasetSelectValue = useMemo(() => {
    const candidate = filters.datasetId || activeDatasetId || ''
    if (!candidate) return ''
    return datasets.some((dataset) => dataset.id === candidate) ? candidate : ''
  }, [activeDatasetId, datasets, filters.datasetId])

  const activeDataset =
    summary?.dataset ??
    (activeDatasetId
      ? {
          id: activeDatasetId,
          name: activeDatasetName ?? t('dashboard.activeDatasetFallback'),
          fileType: '',
          sizeBytes: 0,
          rowCount: 0,
          columns: [],
          createdAt: '',
          updatedAt: '',
          isActive: true,
        }
      : null)

  const handleFiltersChange = (next: Partial<DashboardFilterState>) => {
    setFilters((current) => ({ ...current, ...next }))
  }

  const handleResetFilters = () => {
    setFilters((current) => ({
      ...DEFAULT_FILTERS,
      datasetId: current.datasetId,
    }))
  }

  return (
    <div className="min-h-full">
      <DashboardHeader
        title={t('dashboard.title')}
        description={t('dashboard.subtitle')}
        searchPlaceholder="Search transactions..."
        searchValue={filters.search}
        onSearchChange={(value) => handleFiltersChange({ search: value })}
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
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/app/upload">
                  <UploadCloud className="mr-2 h-4 w-4" />
                  {t('dashboard.uploadData')}
                </Link>
              </Button>
              {process.env.NODE_ENV !== 'production' ? (
                <Button variant="outline" asChild>
                  <Link href="/app/records">Use sample data</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {!error && activeDataset ? (
          <div className="space-y-6">
            <section className="flex flex-wrap items-center justify-between gap-3">
              <div>
                {/* IMPORTANT: this heading is used by e2e assertions */}
                <h2 data-testid="dataset-name" className="text-2xl font-semibold tracking-tight">
                  {activeDataset.name}
                </h2>
                <p className="text-sm text-muted-foreground">Business overview and CRM metrics</p>
              </div>
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
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <KpiCard
                title="Revenue"
                value={formatCurrency(kpiSnapshot.revenue)}
                icon={Wallet}
                tone="blue"
              />
              <KpiCard
                title="Expenses"
                value={formatCurrency(kpiSnapshot.expenses)}
                icon={ReceiptText}
                tone="amber"
              />
              <KpiCard
                title="Profit"
                value={formatCurrency(kpiSnapshot.profit)}
                icon={DollarSign}
                tone={kpiSnapshot.profit >= 0 ? 'emerald' : 'rose'}
              />
              <KpiCard
                title="Transactions"
                value={kpiSnapshot.transactionsCount.toLocaleString()}
                icon={ArrowLeftRight}
                tone="slate"
              />
              <KpiCard
                title="Avg amount"
                value={formatCurrency(kpiSnapshot.avgAmount)}
                icon={DollarSign}
                tone="violet"
              />
              <KpiCard
                title="MoM change"
                value={
                  typeof kpiSnapshot.momChange === 'number'
                    ? `${kpiSnapshot.momChange >= 0 ? '+' : ''}${kpiSnapshot.momChange.toFixed(1)}%`
                    : 'n/a'
                }
                icon={TrendingUp}
                tone="emerald"
                delta={{ value: kpiSnapshot.momChange, label: 'vs previous month' }}
              />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_340px]">
              <div className="space-y-6">
                <Card className="border-border/70 bg-card/90">
                  <CardHeader>
                    <CardTitle className="text-base">Revenue vs Expenses</CardTitle>
                    <CardDescription>Trend over time for the selected date range</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RevenueExpensesLineChart data={lineSeries} />
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/90">
                  <CardHeader>
                    <CardTitle className="text-base">Top Categories</CardTitle>
                    <CardDescription>Highest contributing categories by amount</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TopCategoriesBarChart data={barData} />
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="border-border/70 bg-card/90">
                  <CardHeader>
                    <CardTitle className="text-base">Category Breakdown</CardTitle>
                    <CardDescription>Distribution by selected filters</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CategoryBreakdownDonutChart data={donutData} />
                  </CardContent>
                </Card>

                <FiltersPanel
                  filters={{
                    ...filters,
                    datasetId: datasetSelectValue,
                  }}
                  datasets={datasets}
                  categories={categories}
                  onFiltersChange={handleFiltersChange}
                  onReset={handleResetFilters}
                />
              </div>
            </section>

            <RecentTransactionsTable transactions={filteredTransactions} />
          </div>
        ) : null}
      </main>
    </div>
  )
}
