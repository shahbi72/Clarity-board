type HeatmapRow = {
  category: string
  newBiz: number
  expansion: number
  renewal: number
  upsell: number
}

type HeatmapTableProps = {
  data: HeatmapRow[]
}

function cellTone(value: number) {
  const lightness = 97 - value * 0.45
  const saturation = 58 + Math.round(value * 0.2)
  return {
    backgroundColor: `hsl(203 ${saturation}% ${lightness}%)`,
    color: value >= 78 ? '#0c4a6e' : '#334155',
  }
}

export function HeatmapTable({ data }: HeatmapTableProps) {
  return (
    <div className="h-full overflow-auto rounded-lg border border-slate-200">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Category</th>
            <th className="px-3 py-2 text-center font-semibold">New</th>
            <th className="px-3 py-2 text-center font-semibold">Expansion</th>
            <th className="px-3 py-2 text-center font-semibold">Renewal</th>
            <th className="px-3 py-2 text-center font-semibold">Upsell</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.category} className="border-t border-slate-200">
              <td className="px-3 py-2 font-medium text-slate-700">{row.category}</td>
              <td className="px-3 py-2 text-center font-semibold" style={cellTone(row.newBiz)}>
                {row.newBiz}
              </td>
              <td className="px-3 py-2 text-center font-semibold" style={cellTone(row.expansion)}>
                {row.expansion}
              </td>
              <td className="px-3 py-2 text-center font-semibold" style={cellTone(row.renewal)}>
                {row.renewal}
              </td>
              <td className="px-3 py-2 text-center font-semibold" style={cellTone(row.upsell)}>
                {row.upsell}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
