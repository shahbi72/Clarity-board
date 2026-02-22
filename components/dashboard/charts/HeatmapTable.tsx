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

function cellToneClass(value: number) {
  if (value >= 90) return 'bg-sky-300 text-sky-950'
  if (value >= 80) return 'bg-sky-200 text-sky-900'
  if (value >= 70) return 'bg-sky-100 text-sky-900'
  if (value >= 60) return 'bg-slate-100 text-slate-700'
  return 'bg-slate-50 text-slate-600'
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
              <td className={`px-3 py-2 text-center font-semibold ${cellToneClass(row.newBiz)}`}>
                {row.newBiz}
              </td>
              <td className={`px-3 py-2 text-center font-semibold ${cellToneClass(row.expansion)}`}>
                {row.expansion}
              </td>
              <td className={`px-3 py-2 text-center font-semibold ${cellToneClass(row.renewal)}`}>
                {row.renewal}
              </td>
              <td className={`px-3 py-2 text-center font-semibold ${cellToneClass(row.upsell)}`}>
                {row.upsell}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
