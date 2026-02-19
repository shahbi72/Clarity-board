import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

type SegmentPoint = {
  name: string
  value: number
  color: string
}

type SegmentDonutProps = {
  data: SegmentPoint[]
}

function renderPercentage(value: number, total: number) {
  if (total <= 0) return '0%'
  return `${((value / total) * 100).toFixed(1)}%`
}

export function SegmentDonut({ data }: SegmentDonutProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          innerRadius={68}
          outerRadius={98}
          dataKey="value"
          nameKey="name"
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`${value} (${renderPercentage(value, total)})`, 'Share']}
          contentStyle={{ borderRadius: 12, borderColor: '#cbd5e1' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
