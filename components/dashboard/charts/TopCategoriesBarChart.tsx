'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DashboardBreakdownPoint } from '@/lib/types/data-pipeline'

type TopCategoriesBarChartProps = {
  data: DashboardBreakdownPoint[]
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function TopCategoriesBarChart({ data }: TopCategoriesBarChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-lg border border-dashed border-border/80 text-sm text-muted-foreground">
        No category data available.
      </div>
    )
  }

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            interval={0}
            angle={-12}
            textAnchor="end"
            height={56}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompact}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number) => formatCompact(value)}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--card))',
            }}
          />
          <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
