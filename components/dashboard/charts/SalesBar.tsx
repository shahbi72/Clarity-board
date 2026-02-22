import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type SalesPoint = {
  channel: string
  sales: number
  goal: number
}

type SalesBarProps = {
  data: SalesPoint[]
}

function formatCompact(value: number) {
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return `${value}`
}

export function SalesBar({ data }: SalesBarProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="channel" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={formatCompact} />
        <Tooltip formatter={(value: number) => [formatCompact(value), '']} />
        <Legend />
        <Bar dataKey="goal" fill="#cbd5e1" radius={[6, 6, 0, 0]} name="Goal" />
        <Bar dataKey="sales" fill="#0ea5e9" radius={[6, 6, 0, 0]} name="Sales" />
      </BarChart>
    </ResponsiveContainer>
  )
}
