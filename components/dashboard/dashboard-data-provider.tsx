'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { calculateStoreHealthScore } from '@/lib/shopify/health-score'
import { buildDashboardInsightCards } from '@/lib/shopify/insights'
import { calculateProfitEstimate } from '@/lib/shopify/profit'
import type { ProfitEstimate } from '@/lib/shopify/profit'
import type {
  BusinessStatusResponse,
  EffectivePlan,
  InsightEventsResponse,
  ShopifyCopilotContextPacket,
  ShopifySummary,
  ShopifySummaryApiResponse,
  ShopifyTopProduct,
  ShopifyTrendRangeDays,
} from '@/lib/types/shopify'

type ViewState = {
  loading: boolean
  error: string | null
  paywalled: boolean
  gate: ShopifySummaryApiResponse['gate'] | null
  summary: ShopifySummary | null
  plan: EffectivePlan | null
}

type SpreadsheetItem = {
  id: string
  name: string
}

type SheetTab = {
  name: string
}

type DashboardDisplayInsight = {
  type: string
  title: string
  body: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
}

export type DashboardPlanType = 'starter' | 'business'

type DashboardUserInfo = {
  name: string
  email: string
  avatarUrl: string | null
}

type DashboardDataProviderProps = {
  children: ReactNode
  initialPlanType: DashboardPlanType
  user: DashboardUserInfo
}

type DashboardDataContextValue = {
  isDemoMode: boolean
  planType: DashboardPlanType
  user: DashboardUserInfo
  viewState: ViewState
  billingGate: ShopifySummaryApiResponse['gate'] | null
  summary: ShopifySummary | null
  rangeDays: ShopifyTrendRangeDays
  setRangeDays: (value: ShopifyTrendRangeDays) => void
  includeCancelled: boolean
  setIncludeCancelled: (value: boolean) => void
  refreshSummary: () => Promise<void>
  businessStatus: BusinessStatusResponse | null
  businessError: string | null
  loadingBusiness: boolean
  refreshingSheet: boolean
  pickerOpen: boolean
  setPickerOpen: (value: boolean) => void
  spreadsheets: SpreadsheetItem[]
  sheetTabs: SheetTab[]
  selectedSpreadsheet: SpreadsheetItem | null
  loadBusinessStatus: () => Promise<void>
  loadSpreadsheets: () => Promise<void>
  loadSheetTabs: (spreadsheet: SpreadsheetItem) => Promise<void>
  selectSheet: (sheetName: string) => Promise<void>
  refreshConnectedSheet: () => Promise<void>
  loadingInsights: boolean
  insights: InsightEventsResponse['items']
  loadInsights: (options?: { unreadOnly?: boolean }) => Promise<void>
  unreadCount: number
  markAllInsightsRead: () => Promise<void>
  toggleInsightRead: (insightId: string) => Promise<void>
  feePercentInput: string
  setFeePercentInput: (value: string) => void
  fixedFeePerOrderInput: string
  setFixedFeePerOrderInput: (value: string) => void
  averageShippingPerOrderInput: string
  setAverageShippingPerOrderInput: (value: string) => void
  productCostInputs: Record<string, string>
  setProductCostInput: (productKey: string, value: string) => void
  topProducts: ShopifyTopProduct[]
  topProductsWithProfit: Array<
    ShopifyTopProduct & {
      estimatedProfit: number | null
      marginPct: number | null
    }
  >
  trendPoints: ShopifySummary['trend']
  deadStockItems: ShopifySummary['deadStock']['items']
  ordersByDay: ShopifySummary['salesTiming']['ordersByDay']
  ordersByHour: ShopifySummary['salesTiming']['ordersByHour']
  profitEstimate: ProfitEstimate | null
  estimatedProfitValue: number | null
  marginPct: number | null
  headlineInsights: DashboardDisplayInsight[]
  storeHealth: ReturnType<typeof calculateStoreHealthScore> | null
  healthWhyTooltip: string
  copilotContext: ShopifyCopilotContextPacket | null
  effectivePlan: EffectivePlan | null
}

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null)

const DEFAULT_STATE: ViewState = {
  loading: true,
  error: null,
  paywalled: false,
  gate: null,
  summary: null,
  plan: null,
}

const DEFAULT_FEE_PERCENT = '2.9'
const DEFAULT_FIXED_FEE = '0.30'

export function DashboardDataProvider({
  children,
  initialPlanType,
  user,
}: DashboardDataProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isDemoMode =
    searchParams.get('demo') === '1' || pathname === '/demo' || pathname.startsWith('/demo/')

  const [rangeDays, setRangeDays] = useState<ShopifyTrendRangeDays>(7)
  const [includeCancelled, setIncludeCancelled] = useState(false)
  const [state, setState] = useState<ViewState>(DEFAULT_STATE)

  const [businessStatus, setBusinessStatus] = useState<BusinessStatusResponse | null>(null)
  const [businessError, setBusinessError] = useState<string | null>(null)
  const [loadingBusiness, setLoadingBusiness] = useState(false)
  const [refreshingSheet, setRefreshingSheet] = useState(false)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetItem[]>([])
  const [sheetTabs, setSheetTabs] = useState<SheetTab[]>([])
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<SpreadsheetItem | null>(null)

  const [loadingInsights, setLoadingInsights] = useState(false)
  const [insights, setInsights] = useState<InsightEventsResponse['items']>([])
  const [feePercentInput, setFeePercentInput] = useState(DEFAULT_FEE_PERCENT)
  const [fixedFeePerOrderInput, setFixedFeePerOrderInput] = useState(DEFAULT_FIXED_FEE)
  const [averageShippingPerOrderInput, setAverageShippingPerOrderInput] = useState('')
  const [productCostInputs, setProductCostInputs] = useState<Record<string, string>>({})

  const loadSummary = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }))

    const endpoint = isDemoMode ? '/api/shopify/demo-summary' : '/api/shopify/summary'
    const query = new URLSearchParams({
      rangeDays: String(rangeDays),
      includeCancelled: includeCancelled ? '1' : '0',
    })

    try {
      const response = await fetch(`${endpoint}?${query.toString()}`, { cache: 'no-store' })
      const payload = (await response.json()) as ShopifySummaryApiResponse

      if (response.status === 401 && !isDemoMode) {
        router.push('/login?next=/dashboard')
        return
      }

      if (!response.ok && response.status !== 402) {
        throw new Error(readApiError(payload) || 'Unable to load dashboard.')
      }

      setState({
        loading: false,
        error: payload.error ?? null,
        paywalled: payload.paywalled,
        gate: payload.gate ?? null,
        summary: payload.summary ?? null,
        plan: payload.plan ?? null,
      })
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Unable to load dashboard.',
        paywalled: false,
        gate: null,
        summary: null,
        plan: null,
      })
    }
  }, [includeCancelled, isDemoMode, rangeDays, router])

  const loadBusinessStatus = useCallback(async () => {
    if (isDemoMode) {
      setBusinessStatus(null)
      return
    }

    setLoadingBusiness(true)
    setBusinessError(null)

    try {
      const response = await fetch('/api/business/status', { cache: 'no-store' })
      const payload = (await response.json()) as BusinessStatusResponse | { error?: { message?: string } }

      if (response.status === 401) {
        router.push('/login?next=/dashboard')
        return
      }

      if (!response.ok) {
        throw new Error(readApiError(payload) || 'Unable to load business status.')
      }

      setBusinessStatus(payload as BusinessStatusResponse)
    } catch (error) {
      setBusinessError(error instanceof Error ? error.message : 'Unable to load business status.')
      setBusinessStatus(null)
    } finally {
      setLoadingBusiness(false)
    }
  }, [isDemoMode, router])

  const loadInsights = useCallback(
    async (options?: { unreadOnly?: boolean }) => {
      if (isDemoMode || !businessStatus?.eligible) {
        return
      }

      const query = new URLSearchParams({
        limit: '100',
      })
      if (options?.unreadOnly) {
        query.set('unreadOnly', '1')
      }

      setLoadingInsights(true)

      try {
        const response = await fetch(`/api/business/insights?${query.toString()}`, { cache: 'no-store' })
        const payload = (await response.json()) as InsightEventsResponse | { error?: { message?: string } }
        if (!response.ok) {
          throw new Error(readApiError(payload) || 'Unable to load insights.')
        }

        const typedPayload = payload as InsightEventsResponse
        setInsights(typedPayload.items)
        setBusinessStatus((current) =>
          current
            ? {
                ...current,
                unreadCount: typedPayload.unreadCount,
              }
            : current
        )
      } catch (error) {
        setBusinessError(error instanceof Error ? error.message : 'Unable to load insights.')
      } finally {
        setLoadingInsights(false)
      }
    },
    [businessStatus?.eligible, isDemoMode]
  )

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  useEffect(() => {
    void loadBusinessStatus()
  }, [loadBusinessStatus])

  useEffect(() => {
    if (!isDemoMode && businessStatus?.eligible) {
      void loadInsights()
    }
  }, [businessStatus?.eligible, isDemoMode, loadInsights])

  const loadSpreadsheets = useCallback(async () => {
    try {
      const response = await fetch('/api/business/google/spreadsheets', { cache: 'no-store' })
      const payload = (await response.json()) as { items?: SpreadsheetItem[]; error?: { message?: string } }
      if (!response.ok) {
        throw new Error(readApiError(payload) || 'Unable to load spreadsheets.')
      }

      setSpreadsheets(payload.items ?? [])
    } catch (error) {
      setBusinessError(error instanceof Error ? error.message : 'Unable to load spreadsheets.')
    }
  }, [])

  const loadSheetTabs = useCallback(async (spreadsheet: SpreadsheetItem) => {
    setSelectedSpreadsheet(spreadsheet)
    setSheetTabs([])

    try {
      const response = await fetch(
        `/api/business/google/spreadsheets/${encodeURIComponent(spreadsheet.id)}/sheets`,
        { cache: 'no-store' }
      )
      const payload = (await response.json()) as { items?: SheetTab[]; error?: { message?: string } }
      if (!response.ok) {
        throw new Error(readApiError(payload) || 'Unable to load sheets.')
      }

      setSheetTabs(payload.items ?? [])
    } catch (error) {
      setBusinessError(error instanceof Error ? error.message : 'Unable to load sheets.')
    }
  }, [])

  const selectSheet = useCallback(
    async (sheetName: string) => {
      if (!selectedSpreadsheet) {
        return
      }

      try {
        const response = await fetch('/api/business/google/select', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            spreadsheetId: selectedSpreadsheet.id,
            spreadsheetName: selectedSpreadsheet.name,
            sheetName,
          }),
        })

        const payload = (await response.json()) as { error?: { message?: string } }
        if (!response.ok) {
          throw new Error(readApiError(payload) || 'Unable to save sheet selection.')
        }

        setPickerOpen(false)
        await loadBusinessStatus()
      } catch (error) {
        setBusinessError(error instanceof Error ? error.message : 'Unable to save sheet selection.')
      }
    },
    [loadBusinessStatus, selectedSpreadsheet]
  )

  const refreshConnectedSheet = useCallback(async () => {
    setRefreshingSheet(true)
    setBusinessError(null)

    try {
      const response = await fetch('/api/business/sync/refresh', {
        method: 'POST',
      })
      const payload = (await response.json()) as { error?: { message?: string } }
      if (!response.ok) {
        throw new Error(readApiError(payload) || 'Unable to refresh sheet.')
      }

      await Promise.all([loadSummary(), loadBusinessStatus(), loadInsights()])
    } catch (error) {
      setBusinessError(error instanceof Error ? error.message : 'Unable to refresh sheet.')
    } finally {
      setRefreshingSheet(false)
    }
  }, [loadBusinessStatus, loadInsights, loadSummary])

  const markInsightsRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      return
    }

    const response = await fetch('/api/business/insights/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    })

    const payload = (await response.json()) as { unreadCount?: number; error?: { message?: string } }
    if (!response.ok) {
      throw new Error(readApiError(payload) || 'Unable to mark insights as read.')
    }

    const nowIso = new Date().toISOString()
    const idSet = new Set(ids)
    setInsights((current) =>
      current.map((item) => (idSet.has(item.id) ? { ...item, readAt: nowIso } : item))
    )
    setBusinessStatus((current) =>
      current
        ? {
            ...current,
            unreadCount: payload.unreadCount ?? 0,
          }
        : current
    )
  }, [])

  const markAllInsightsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/business/insights/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ all: true }),
      })
      const payload = (await response.json()) as { unreadCount?: number; error?: { message?: string } }
      if (!response.ok) {
        throw new Error(readApiError(payload) || 'Unable to mark insights as read.')
      }

      const nowIso = new Date().toISOString()
      setInsights((current) => current.map((item) => ({ ...item, readAt: nowIso })))
      setBusinessStatus((current) =>
        current
          ? {
              ...current,
              unreadCount: payload.unreadCount ?? 0,
            }
          : current
      )
    } catch (error) {
      setBusinessError(error instanceof Error ? error.message : 'Unable to mark insights as read.')
    }
  }, [])

  const toggleInsightRead = useCallback(
    async (insightId: string) => {
      const target = insights.find((item) => item.id === insightId)
      if (!target) {
        return
      }

      if (!target.readAt) {
        try {
          await markInsightsRead([insightId])
        } catch (error) {
          setBusinessError(error instanceof Error ? error.message : 'Unable to update insight status.')
        }
        return
      }

      // Unread action is local-only because existing API currently supports read operations.
      setInsights((current) =>
        current.map((item) => (item.id === insightId ? { ...item, readAt: null } : item))
      )
      setBusinessStatus((current) =>
        current
          ? {
              ...current,
              unreadCount: current.unreadCount + 1,
            }
          : current
      )
    },
    [insights, markInsightsRead]
  )

  const summary = state.summary
  const topProducts = useMemo(() => summary?.topProducts ?? [], [summary?.topProducts])
  const trendPoints = useMemo(() => summary?.trend ?? [], [summary?.trend])
  const deadStockItems = useMemo(() => summary?.deadStock.items ?? [], [summary?.deadStock.items])
  const ordersByDay = useMemo(() => summary?.salesTiming.ordersByDay ?? [], [summary?.salesTiming.ordersByDay])
  const ordersByHour = useMemo(() => summary?.salesTiming.ordersByHour ?? [], [summary?.salesTiming.ordersByHour])

  const feePercent = useMemo(() => parseOptionalNumber(feePercentInput) ?? 0, [feePercentInput])
  const fixedFeePerOrder = useMemo(() => parseOptionalNumber(fixedFeePerOrderInput) ?? 0, [fixedFeePerOrderInput])
  const averageShippingPerOrder = useMemo(
    () => parseOptionalNumber(averageShippingPerOrderInput) ?? 0,
    [averageShippingPerOrderInput]
  )

  const productCosts = useMemo(() => {
    const next: Record<string, number> = {}
    for (const product of topProducts) {
      const key = productIdentity(product)
      const parsed = parseOptionalNumber(productCostInputs[key] ?? '')
      if (parsed != null && parsed >= 0) {
        next[key] = parsed
      }
    }
    return next
  }, [productCostInputs, topProducts])

  const hasAnyCostInput = Object.keys(productCosts).length > 0
  const hasAnyShippingInput = averageShippingPerOrder > 0
  const hasCustomFeeInput =
    Math.abs(feePercent - Number(DEFAULT_FEE_PERCENT)) > 0.0001 ||
    Math.abs(fixedFeePerOrder - Number(DEFAULT_FIXED_FEE)) > 0.0001
  const profitConfigured = hasAnyCostInput || hasAnyShippingInput || hasCustomFeeInput

  const profitEstimate = useMemo(() => {
    if (!summary || !profitConfigured) {
      return null
    }

    const products = topProducts.map((product) => ({
      key: productIdentity(product),
      productName: product.productName,
      unitsSold: product.unitsSold,
      revenue: product.revenue,
    }))

    return calculateProfitEstimate({
      grossRevenue: summary.totals.totalRevenue + summary.totals.totalRefunded,
      refunded: summary.totals.totalRefunded,
      totalOrders: summary.totals.totalOrders,
      totalUnitsSold: summary.totals.totalUnitsSold,
      feePercent,
      fixedFeePerOrder,
      avgShippingPerOrder: averageShippingPerOrder,
      productCosts,
      products,
    })
  }, [
    averageShippingPerOrder,
    feePercent,
    fixedFeePerOrder,
    productCosts,
    profitConfigured,
    summary,
    topProducts,
  ])

  const estimatedProfitValue = profitEstimate?.estimatedProfit ?? summary?.totals.estimatedProfit ?? null
  const marginPct = profitEstimate?.marginPct ?? null

  const topProductsWithProfit = useMemo(() => {
    const profitMap = new Map(profitEstimate?.products.map((item) => [item.key, item]))

    return topProducts.map((product) => {
      const key = productIdentity(product)
      const profitRow = profitMap.get(key)
      return {
        ...product,
        estimatedProfit: profitRow?.estimatedProfit ?? null,
        marginPct: profitRow?.marginPct ?? null,
      }
    })
  }, [profitEstimate?.products, topProducts])

  const problemInsights = useMemo(() => {
    if (!summary) {
      return []
    }

    return buildDashboardInsightCards({
      summary,
      profit: profitEstimate
        ? {
            marginPct: profitEstimate.marginPct,
            previousMarginPct: summary.comparison7d.previous.marginPct,
            lowMarginProductCount: profitEstimate.lowMarginProducts.length,
          }
        : undefined,
    })
  }, [profitEstimate, summary])

  const headlineInsights = useMemo<DashboardDisplayInsight[]>(() => {
    if (!summary) {
      return []
    }

    if (!isDemoMode && businessStatus?.eligible && insights.length > 0) {
      return insights.slice(0, 6).map((item) => ({
        type: item.type,
        title: item.title,
        body: item.body,
        severity: item.severity,
      }))
    }

    return problemInsights.map((item) => ({
      type: item.type,
      title: item.title,
      body: item.body,
      severity:
        item.severity === 'HIGH'
          ? ('CRITICAL' as const)
          : item.severity === 'MED'
            ? ('WARNING' as const)
            : ('INFO' as const),
    }))
  }, [businessStatus?.eligible, insights, isDemoMode, problemInsights, summary])

  const storeHealth = useMemo(() => {
    if (!summary) {
      return null
    }

    return calculateStoreHealthScore({
      summary,
      marginPct,
    })
  }, [marginPct, summary])

  const healthWhyTooltip = useMemo(() => {
    if (!storeHealth) {
      return ''
    }

    return storeHealth.factors
      .map((factor) => `${factor.label}: ${factor.score}/${factor.maxScore} - ${factor.reason}`)
      .join('\n')
  }, [storeHealth])

  const copilotContext = useMemo<ShopifyCopilotContextPacket | null>(() => {
    if (!summary) {
      return null
    }

    const insightContext =
      insights.length > 0
        ? insights.slice(0, 5).map((item) => ({
            type: item.type,
            title: item.title,
            body: item.body,
            severity: item.severity,
            deltaJson: item.deltaJson,
          }))
        : problemInsights.slice(0, 5).map((item) => ({
            type: item.type,
            title: item.title,
            body: item.body,
            severity:
              item.severity === 'HIGH'
                ? ('CRITICAL' as const)
                : item.severity === 'MED'
                  ? ('WARNING' as const)
                  : ('INFO' as const),
            deltaJson: null,
          }))

    return {
      comparison7d: {
        current: summary.comparison7d.current,
        previous: summary.comparison7d.previous,
        deltas: {
          ...summary.comparison7d.deltas,
          revenueDelta: summary.comparison7d.current.revenue - summary.comparison7d.previous.revenue,
          ordersDelta: summary.comparison7d.current.orders - summary.comparison7d.previous.orders,
          averageOrderValueDelta:
            summary.comparison7d.current.averageOrderValue - summary.comparison7d.previous.averageOrderValue,
          unitsSoldDelta: summary.comparison7d.current.unitsSold - summary.comparison7d.previous.unitsSold,
          refundedDelta: summary.comparison7d.current.refunded - summary.comparison7d.previous.refunded,
        },
      },
      kpis: {
        totalRevenue: summary.totals.totalRevenue,
        totalOrders: summary.totals.totalOrders,
        averageOrderValue: summary.totals.averageOrderValue,
        totalUnitsSold: summary.totals.totalUnitsSold,
        totalRefunded: summary.totals.totalRefunded,
      },
      topProducts: summary.topProducts,
      topSkuDeclines: summary.comparison7d.topSkuDeclines,
      profit: {
        estimatedProfit: estimatedProfitValue,
        marginPct,
        lowMarginProducts:
          profitEstimate?.lowMarginProducts.map((item) => ({
            productName: item.productName,
            marginPct: item.marginPct ?? 0,
          })) ?? [],
      },
      insights: insightContext,
    }
  }, [estimatedProfitValue, insights, marginPct, problemInsights, profitEstimate?.lowMarginProducts, summary])

  const unreadCount = useMemo(() => {
    if (insights.length > 0) {
      return insights.filter((item) => item.readAt == null).length
    }
    return businessStatus?.unreadCount ?? 0
  }, [businessStatus?.unreadCount, insights])

  const planType = initialPlanType
  const effectivePlan = state.plan ?? (planType === 'business' ? 'business' : 'basic')

  const value = useMemo<DashboardDataContextValue>(
    () => ({
      isDemoMode,
      planType,
      user,
      viewState: state,
      billingGate: state.gate,
      summary,
      rangeDays,
      setRangeDays,
      includeCancelled,
      setIncludeCancelled,
      refreshSummary: loadSummary,
      businessStatus,
      businessError,
      loadingBusiness,
      refreshingSheet,
      pickerOpen,
      setPickerOpen,
      spreadsheets,
      sheetTabs,
      selectedSpreadsheet,
      loadBusinessStatus,
      loadSpreadsheets,
      loadSheetTabs,
      selectSheet,
      refreshConnectedSheet,
      loadingInsights,
      insights,
      loadInsights,
      unreadCount,
      markAllInsightsRead,
      toggleInsightRead,
      feePercentInput,
      setFeePercentInput,
      fixedFeePerOrderInput,
      setFixedFeePerOrderInput,
      averageShippingPerOrderInput,
      setAverageShippingPerOrderInput,
      productCostInputs,
      setProductCostInput: (productKey: string, value: string) => {
        setProductCostInputs((current) => ({
          ...current,
          [productKey]: value,
        }))
      },
      topProducts,
      topProductsWithProfit,
      trendPoints,
      deadStockItems,
      ordersByDay,
      ordersByHour,
      profitEstimate,
      estimatedProfitValue,
      marginPct,
      headlineInsights,
      storeHealth,
      healthWhyTooltip,
      copilotContext,
      effectivePlan,
    }),
    [
      averageShippingPerOrderInput,
      businessError,
      businessStatus,
      copilotContext,
      deadStockItems,
      effectivePlan,
      feePercentInput,
      fixedFeePerOrderInput,
      headlineInsights,
      healthWhyTooltip,
      includeCancelled,
      insights,
      isDemoMode,
      loadBusinessStatus,
      loadInsights,
      loadSheetTabs,
      loadSpreadsheets,
      loadSummary,
      loadingBusiness,
      loadingInsights,
      marginPct,
      markAllInsightsRead,
      ordersByDay,
      ordersByHour,
      pickerOpen,
      planType,
      productCostInputs,
      profitEstimate,
      rangeDays,
      refreshConnectedSheet,
      refreshingSheet,
      selectSheet,
      selectedSpreadsheet,
      sheetTabs,
      spreadsheets,
      state,
      storeHealth,
      summary,
      toggleInsightRead,
      topProducts,
      topProductsWithProfit,
      trendPoints,
      unreadCount,
      user,
      estimatedProfitValue,
    ]
  )

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>
}

export function useDashboardData(): DashboardDataContextValue {
  const context = useContext(DashboardDataContext)
  if (!context) {
    throw new Error('useDashboardData must be used within DashboardDataProvider.')
  }
  return context
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Never'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

export function severityBadgeClass(
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'HIGH' | 'MED'
): string {
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    return 'rounded-md bg-[#ef4444]/10 px-2 py-1 text-xs font-semibold text-[#ef4444]'
  }

  if (severity === 'WARNING' || severity === 'MED') {
    return 'rounded-md bg-[#f59e0b]/10 px-2 py-1 text-xs font-semibold text-[#f59e0b]'
  }

  return 'rounded-md bg-[#4285f4]/10 px-2 py-1 text-xs font-semibold text-[#4285f4]'
}

export function healthLabelClass(label: 'Excellent' | 'Good' | 'Watch' | 'Risk'): string {
  if (label === 'Excellent') {
    return 'text-[#22c55e]'
  }

  if (label === 'Good') {
    return 'text-[#4285f4]'
  }

  if (label === 'Watch') {
    return 'text-[#f59e0b]'
  }

  return 'text-[#ef4444]'
}

export function productIdentity(product: ShopifyTopProduct): string {
  return `${(product.sku ?? '').trim().toLowerCase()}::${product.productName.trim().toLowerCase()}`
}

function parseOptionalNumber(value: string): number | null {
  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return parsed
}

function readApiError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const value = (payload as { error?: unknown }).error
  if (typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object') {
    const message = (value as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return null
}
