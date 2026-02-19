export type DateRangeOption = '30d' | '90d' | '12m'
export type RegionOption = 'all' | 'na' | 'eu' | 'apac'
export type ProductOption = 'all' | 'clarity' | 'insights' | 'ops'

type TopFiltersProps = {
  dateRange: DateRangeOption
  onDateRangeChange: (value: DateRangeOption) => void
  region: RegionOption
  onRegionChange: (value: RegionOption) => void
  product: ProductOption
  onProductChange: (value: ProductOption) => void
  searchTerm: string
  onSearchTermChange: (value: string) => void
  onExport: () => void
}

export function TopFilters({
  dateRange,
  onDateRangeChange,
  region,
  onRegionChange,
  product,
  onProductChange,
  searchTerm,
  onSearchTermChange,
  onExport,
}: TopFiltersProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
            Date Range
          </span>
          <select
            aria-label="Date range select"
            value={dateRange}
            onChange={(event) => onDateRangeChange(event.target.value as DateRangeOption)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none ring-sky-200 transition focus:ring-2"
          >
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="12m">Last 12 months</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Region</span>
          <select
            aria-label="Region select"
            value={region}
            onChange={(event) => onRegionChange(event.target.value as RegionOption)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none ring-sky-200 transition focus:ring-2"
          >
            <option value="all">All regions</option>
            <option value="na">North America</option>
            <option value="eu">Europe</option>
            <option value="apac">APAC</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
            Product
          </span>
          <select
            aria-label="Product select"
            value={product}
            onChange={(event) => onProductChange(event.target.value as ProductOption)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none ring-sky-200 transition focus:ring-2"
          >
            <option value="all">All products</option>
            <option value="clarity">Clarity Board</option>
            <option value="insights">Insights AI</option>
            <option value="ops">Ops Agent</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
            Search
          </span>
          <input
            aria-label="Search metrics"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Search campaign, rep, segment..."
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none ring-sky-200 transition focus:ring-2"
          />
        </label>

        <div className="flex items-end">
          <button
            type="button"
            aria-label="Export dashboard data"
            onClick={onExport}
            className="h-10 w-full rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700 sm:w-auto"
          >
            Export
          </button>
        </div>
      </div>
    </section>
  )
}
