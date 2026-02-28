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
    estimatedProfit: number | null
  }
  trend: ShopifyTrendPoint[]
  topProducts: ShopifyTopProduct[]
  excludedCancelledOrders: number
}

export interface ShopifySummaryApiResponse {
  paywalled: boolean
  gate?: ShopifyBillingGate
  summary?: ShopifySummary
  error?: string
}
