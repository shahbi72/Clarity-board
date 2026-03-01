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
  excludedCancelledOrders: number
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
  type: string
  title: string
  body: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  createdAt: string
  readAt: string | null
}

export interface InsightEventsResponse {
  unreadCount: number
  items: InsightEventDto[]
}
