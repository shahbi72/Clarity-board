export type ShopifyTrendRangeDays = 7 | 30

export type ShopifyBillingGateReason =
  | 'ok'
  | 'missing_subscription'
  | 'trial_expired'
  | 'inactive_subscription'

export interface ShopifyBillingGate {
  allowed: boolean
  reason: ShopifyBillingGateReason
  status: string | null
  trialEndsAt: string | null
}

export interface ShopifyTopProduct {
  productName: string
  sku: string | null
  unitsSold: number
  revenue: number
}

export interface ShopifyPeriodWindow {
  from: string
  to: string
  revenue: number
  orders: number
  unitsSold: number
  refunded: number
  averageOrderValue: number
  refundRate: number
  marginPct: number | null
}

export interface ShopifyTopSkuDecline {
  productName: string
  sku: string | null
  previousRevenue: number
  currentRevenue: number
  deltaPct: number
  deltaValue: number
  contributionShare: number | null
}

export interface ShopifyPeriodComparison {
  windowDays: 7
  current: ShopifyPeriodWindow
  previous: ShopifyPeriodWindow
  deltas: {
    revenuePct: number
    ordersPct: number
    averageOrderValuePct: number
    refundRateDelta: number
    refundRateRelative: number | null
    marginDelta: number | null
  }
  topSkuDeclines: ShopifyTopSkuDecline[]
}

export interface ShopifyDeadStockItem {
  productName: string
  sku: string | null
  lastOrderDate: string
  totalUnitsSold: number
}

export interface ShopifyDayOrdersPoint {
  day: string
  orders: number
}

export interface ShopifyHourOrdersPoint {
  hour: number
  label: string
  orders: number
}

export interface ShopifyTrendPoint {
  date: string
  revenue: number
}

export interface ShopifySummary {
  source: 'user' | 'demo'
  datasetName: string | null
  rangeDays: ShopifyTrendRangeDays
  includeCancelled: boolean
  hasData: boolean
  currency: 'USD'
  totals: {
    totalRevenue: number
    totalOrders: number
    averageOrderValue: number
    totalUnitsSold: number
    totalRefunded: number
    estimatedProfit: number | null
  }
  trend: ShopifyTrendPoint[]
  topProducts: ShopifyTopProduct[]
  comparison7d: ShopifyPeriodComparison
  excludedCancelledOrders: number
  deadStock: {
    lookbackDays: 30
    items: ShopifyDeadStockItem[]
  }
  salesTiming: {
    bestDay: string | null
    bestHour: string | null
    ordersByDay: ShopifyDayOrdersPoint[]
    ordersByHour: ShopifyHourOrdersPoint[]
  }
}

export interface ShopifySummaryApiResponse {
  paywalled: boolean
  plan?: EffectivePlan
  gate?: ShopifyBillingGate
  summary?: ShopifySummary
  error?: string
}

export type EffectivePlan = 'free' | 'basic' | 'pro' | 'business'

export interface BusinessSourceStatus {
  connected: boolean
  provider: 'GOOGLE_SHEETS'
  spreadsheetName: string | null
  sheetName: string | null
  lastSyncedAt: string | null
}

export interface BusinessStatusResponse {
  eligible: boolean
  reason: 'ok' | 'plan_upgrade_required' | 'trial_expired' | 'inactive_subscription'
  message: string | null
  source: BusinessSourceStatus
  unreadCount: number
}

export interface InsightEventDto {
  id: string
  periodKey: string
  type: string
  title: string
  body: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  deltaJson: Record<string, unknown> | null
  createdAt: string
  readAt: string | null
}

export interface InsightEventsResponse {
  unreadCount: number
  items: InsightEventDto[]
}

export interface ShopifyCopilotContextPacket {
  comparison7d: {
    current: ShopifyPeriodWindow
    previous: ShopifyPeriodWindow
    deltas: ShopifyPeriodComparison['deltas'] & {
      revenueDelta: number
      ordersDelta: number
      averageOrderValueDelta: number
      unitsSoldDelta: number
      refundedDelta: number
    }
  }
  kpis: {
    totalRevenue: number
    totalOrders: number
    averageOrderValue: number
    totalUnitsSold: number
    totalRefunded: number
  }
  topProducts: ShopifyTopProduct[]
  topSkuDeclines: ShopifyTopSkuDecline[]
  profit: {
    estimatedProfit: number | null
    marginPct: number | null
    lowMarginProducts: Array<{
      productName: string
      marginPct: number
    }>
  }
  insights: Array<{
    type: string
    title: string
    body: string
    severity: 'INFO' | 'WARNING' | 'CRITICAL'
    deltaJson: Record<string, unknown> | null
  }>
}

export interface ShopifyCopilotResponse {
  answer: string
  plan: EffectivePlan
  remainingQuestionsToday: number | null
}
