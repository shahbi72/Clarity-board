'use client'

import { Cell, Label, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
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
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-border/80 text-sm text-muted-foreground">
        No breakdown available.
      </div>
    )
  }

  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="h-[300px] w-full">
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
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !('cx' in viewBox) || !('cy' in viewBox)) return null
                const cx = Number(viewBox.cx)
                const cy = Number(viewBox.cy)

                return (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan
                      x={cx}
                      dy="-0.6em"
                      fill="hsl(var(--muted-foreground))"
                      fontSize="12"
                    >
                      Total
                    </tspan>
                    <tspan x={cx} dy="1.25em" fill="hsl(var(--foreground))" fontSize="14">
                      {formatCurrency(total)}
                    </tspan>
                  </text>
                )
              }}
            />
          </Pie>
          <Tooltip
            formatter={(value: number, _name, item) => [formatCurrency(value), item?.name ?? '']}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--card))',
            }}
          />
          <Legend verticalAlign="bottom" iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
