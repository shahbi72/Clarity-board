import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Percent,
  ReceiptText,
  Wallet,
} from 'lucide-react'

import { cn } from '@/lib/utils'

export type KpiCardItem = {
  label: 'Total Revenue' | 'Total Orders' | 'Avg Order Value' | 'Churn'
  value: string
  growth: string
  trend: 'up' | 'down'
}

type KpiCardsProps = {
  items: KpiCardItem[]
}

const KPI_ICONS = {
  'Total Revenue': DollarSign,
  'Total Orders': ReceiptText,
  'Avg Order Value': Wallet,
  Churn: Percent,
}

export function KpiCards({ items }: KpiCardsProps) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = KPI_ICONS[item.label]
        const TrendIcon = item.trend === 'up' ? ArrowUpRight : ArrowDownRight
        const trendClass = item.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'

        return (
          <article
            key={item.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-slate-500">{item.label}</p>
              <span className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                <Icon className="size-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{item.value}</p>
            <p className={cn('mt-2 inline-flex items-center gap-1 text-sm font-medium', trendClass)}>
              <TrendIcon className="size-4" />
              {item.growth}
            </p>
          </article>
        )
      })}
    </section>
  )
}
