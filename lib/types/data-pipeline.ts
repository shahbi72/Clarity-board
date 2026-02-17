export type DataCellValue = string | number | boolean | null
export type DataRow = Record<string, DataCellValue>

export interface DatasetListItem {
  id: string
  name: string
  fileType: string
  sizeBytes: number
  rowCount: number
  columns: string[]
  createdAt: string
  updatedAt: string
  isActive: boolean
}

export interface ActiveDatasetMetadata {
  id: string
  name: string
  fileType: string
  rowCount: number
  columns: string[]
  updatedAt: string
}

export interface DatasetsResponse {
  datasets: DatasetListItem[]
  activeDatasetId: string | null
}

export interface ActiveDatasetResponse {
  dataset: ActiveDatasetMetadata | null
}

export interface DatasetDetailsResponse {
  dataset: DatasetListItem
  previewRows: DataRow[]
}

export interface UploadDatasetResponse {
  datasetId: string
  datasetName: string
  fileType: string
  rowCount: number
  columns: string[]
  previewRows: DataRow[]
}

export interface DashboardMetrics {
  rowCount: number
  columnCount: number
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  cashIn: number
  cashOut: number
}

export interface DashboardSeriesPoint {
  label: string
  revenue: number
  expenses: number
  profit: number
}

export interface DashboardBreakdownPoint {
  name: string
  value: number
}

export interface DashboardRecentTransaction {
  rowIndex: number
  date: string | null
  description: string | null
  category: string | null
  type: 'revenue' | 'expense' | 'unknown'
  revenue: number
  expense: number
  amount: number
  data: DataRow
}

export interface DashboardSummaryResponse {
  dataset: DatasetListItem | null
  mappings: {
    dateColumn: string | null
    amountColumn: string | null
    typeColumn: string | null
    categoryColumn: string | null
    revenueColumn: string | null
    expenseColumn: string | null
    productColumn: string | null
    customerColumn: string | null
  }
  metrics: DashboardMetrics
  charts: {
    monthlySeries: DashboardSeriesPoint[]
    topItems: DashboardBreakdownPoint[]
    expenseBreakdown: DashboardBreakdownPoint[]
  }
  previewRows: DataRow[]
  recentTransactions: DashboardRecentTransaction[]
  fallback: {
    monthlySeries: string | null
    topItems: string | null
    expenseBreakdown: string | null
  }
}

export interface SuggestionsSummary {
  bullets: string[]
}

export interface SuggestionsMissingField {
  column: string
  missingCount: number
  missingRate: number
}

export interface SuggestionsQuality {
  missingFields: SuggestionsMissingField[]
  duplicateCount: number
  invalidDates: number
  outlierCount: number
}

export interface SuggestionsTrendPoint {
  date: string
  value: number
}

export interface SuggestionsTrends {
  timeseries: SuggestionsTrendPoint[]
  momGrowthPct: number | null
}

export interface SuggestionsCategoryPoint {
  name: string
  value: number
}

export interface SuggestionsMetrics {
  total: number
  average: number
  min: number | null
  max: number | null
  sampleSize: number
}

export interface SuggestionsResponse {
  dataset: ActiveDatasetMetadata | null
  mappings: {
    dateColumn: string | null
    primaryMetricColumn: string | null
    categoryColumn: string | null
    numericColumns: string[]
  }
  summary: SuggestionsSummary
  quality: SuggestionsQuality
  metrics: SuggestionsMetrics
  trends: SuggestionsTrends
  topCategories: SuggestionsCategoryPoint[]
  recommendations: string[]
}

export type SuggestionsPayload = Omit<SuggestionsResponse, 'dataset'>

export interface SuggestionsApiResponse {
  datasetMeta: ActiveDatasetMetadata | null
  suggestionsPayload: SuggestionsPayload | null
}
