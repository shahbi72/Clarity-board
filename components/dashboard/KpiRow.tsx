import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

export type KpiItem = {
  label: string
  value: string
  delta: string
  trend: 'up' | 'down' | 'neutral'
}

type KpiRowProps = {
  items: KpiItem[]
}

export function KpiRow({ items }: KpiRowProps) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.trend === 'up' ? ArrowUpRight : item.trend === 'down' ? ArrowDownRight : Minus
        const deltaColor =
          item.trend === 'up'
            ? 'text-emerald-600'
            : item.trend === 'down'
              ? 'text-sky-600'
              : 'text-slate-500'

        return (
          <article key={item.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
            <p className={`mt-2 inline-flex items-center gap-1 text-sm font-medium ${deltaColor}`}>
              <Icon className="size-4" />
              {item.delta}
            </p>
          </article>
        )
      })}
    </section>
  )
}
