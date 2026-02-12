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

  return (
    <div className="space-y-2">
      {txs.length === 0 ? (
        <div className="text-sm text-muted-foreground">Upload a CSV to see a preview.</div>
      ) : (
        <>
          <div className="text-xs text-muted-foreground">
            Showing {rows.length} of {txs.length} rows
          </div>
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <table className="w-full text-sm">
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
                  <tr key={i} className="border-t border-border/60 odd:bg-background/40 hover:bg-accent/30">
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
