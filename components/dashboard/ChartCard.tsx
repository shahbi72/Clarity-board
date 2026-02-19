import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type ChartCardProps = {
  title: string
  subtitle?: string
  loading?: boolean
  className?: string
  chartHeightClassName?: string
  children: ReactNode
}

export function ChartCard({
  title,
  subtitle,
  loading = false,
  className,
  chartHeightClassName = 'h-[300px]',
  children,
}: ChartCardProps) {
  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white p-5 shadow-sm', className)}>
      <header className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </header>

      {loading ? (
        <div
          className={cn(
            'w-full animate-pulse rounded-lg border border-slate-100 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100',
            chartHeightClassName
          )}
        />
      ) : (
        <div className={chartHeightClassName}>{children}</div>
      )}
    </section>
  )
}
