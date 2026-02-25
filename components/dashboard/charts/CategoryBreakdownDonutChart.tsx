'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { DashboardBreakdownPoint } from '@/lib/types/data-pipeline'

type CategoryBreakdownDonutChartProps = {
  data: DashboardBreakdownPoint[]
}

const DONUT_COLORS = ['#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#22c55e', '#f59e0b']

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function CategoryBreakdownDonutChart({ data }: CategoryBreakdownDonutChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-border/80 text-sm text-muted-foreground">
        No breakdown available.
      </div>
    )
  }

  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={64}
            outerRadius={100}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((item, index) => (
              <Cell key={item.name} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
