import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type RevenuePoint = {
  period: string
  revenue: number
  target: number
}

type RevenueLineProps = {
  data: RevenuePoint[]
}

function formatMoney(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  return `$${Math.round(value / 1_000)}k`
}

export function RevenueLine({ data }: RevenueLineProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
          tickFormatter={formatMoney}
        />
        <Tooltip
          formatter={(value: number) => [formatMoney(value), '']}
          contentStyle={{ borderRadius: 12, borderColor: '#cbd5e1' }}
          labelStyle={{ color: '#0f172a', fontWeight: 600 }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="target"
          name="Target"
          stroke="#94a3b8"
          strokeWidth={2}
          dot={false}
          strokeDasharray="6 4"
        />
        <Line
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="#0284c7"
          strokeWidth={3}
          dot={false}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
