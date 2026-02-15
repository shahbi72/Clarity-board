'use client'

import React from 'react'

type Tx = {
  amount: number
  type: 'revenue' | 'expense'
  productName?: string
  date?: string
}

type Props = {
  txs: Tx[]
  limit?: number
}

export default function CsvPreview({ txs, limit = 20 }: Props) {
  const rows = txs.slice(0, limit)
  const state = txs.length === 0 ? 'empty' : 'ready'

  return (
    <div className="space-y-4" data-testid="csv-preview" data-state={state}>
      {txs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
          Upload a CSV to see insights.
        </div>
      ) : (
        <>
          <div className="text-xs font-medium text-muted-foreground">
            Showing {rows.length} of {txs.length} rows
          </div>
          <div className="overflow-x-auto rounded-lg border border-border/70 bg-card/70">
            <table className="w-full text-sm" data-testid="csv-preview-table">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Product</th>
                  <th className="px-3 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t, i) => (
                  <tr
                    key={i}
                    className="border-t border-border/60 odd:bg-background/40 hover:bg-accent/30"
                    data-testid="csv-preview-row"
                  >
                    <td className="px-3 py-2 capitalize">{t.type}</td>
                    <td className="px-3 py-2 font-medium">{t.amount.toFixed(2)}</td>
                    <td className="px-3 py-2">{t.productName ?? '-'}</td>
                    <td className="px-3 py-2">{t.date ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
