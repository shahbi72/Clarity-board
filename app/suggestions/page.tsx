'use client'

import React from 'react'
import CsvUpload from '@/components/data/csv-upload'

type Tx = {
  amount: number
  type: 'revenue' | 'expense'
  productName?: string
  date?: string
}

export default function Page() {
  const [txs, setTxs] = React.useState<Tx[]>([])
  const headers = ['type', 'amount', 'productName', 'date'] as const

  const previewRows = React.useMemo(() => txs.slice(0, 100), [txs])

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Clarity Board</h1>
        <p className="text-sm text-muted-foreground">
          Upload any CSV. We&apos;ll show the columns + a preview. Then we can generate insights.
        </p>
      </div>

      <CsvUpload onLoaded={setTxs} />

      <div className="rounded-xl border p-4 text-sm">
        <div><span className="font-semibold">Columns:</span> {headers.length}</div>
        <div><span className="font-semibold">Rows:</span> {txs.length}</div>
      </div>

      <div className="rounded-xl border p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold">Preview (first {previewRows.length} rows)</div>
          <div className="text-xs text-muted-foreground">
            Tip: If you don&apos;t see your data, your CSV might be using &ldquo;;&rdquo; delimiter.
          </div>
        </div>

        {txs.length === 0 ? (
          <div className="text-sm text-muted-foreground">Upload a CSV to see preview.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  {headers.map((h) => (
                    <th key={h} className="py-2 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, i) => (
                  <tr key={i} className="border-b">
                    {headers.map((h) => (
                      <td key={h} className="py-2 pr-4 whitespace-nowrap">
                        {h === 'productName'
                          ? r.productName ?? ''
                          : h === 'date'
                            ? r.date ?? ''
                            : h === 'type'
                              ? r.type
                              : r.amount.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
