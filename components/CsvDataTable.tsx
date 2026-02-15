'use client'

import React from 'react'

type Tx = {
  amount: number
  type: 'revenue' | 'expense'
  productName?: string
  date?: string
}

type GenericRecord = Record<string, string>

type Props = {
  txs?: Tx[]
  records?: GenericRecord[]
}

export default function CsvDataTable({ txs = [], records }: Props) {
  if (records) {
    const columns = records.length > 0 ? Object.keys(records[0]) : []
    const state = records.length === 0 ? 'empty' : 'ready'
    return (
      <div
        className="overflow-hidden rounded-lg border border-border/70 bg-card/70"
        data-testid="csv-data-table"
        data-state={state}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="px-3 py-3">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(columns.length, 1)}
                    className="px-3 py-6 text-muted-foreground"
                    data-testid="csv-data-table-empty"
                  >
                    Upload a CSV to see insights.
                  </td>
                </tr>
              ) : (
                records.map((row, i) => (
                  <tr
                    key={i}
                    className="border-t border-border/60 odd:bg-background/40 hover:bg-accent/30"
                    data-testid="csv-data-table-row"
                  >
                    {columns.map((column) => (
                      <td key={column} className="px-3 py-2">
                        {row[column] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const state = txs.length === 0 ? 'empty' : 'ready'
  return (
    <div
      className="overflow-hidden rounded-lg border border-border/70 bg-card/70"
      data-testid="csv-data-table"
      data-state={state}
    >
      <div className="overflow-x-auto">
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
            {txs.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-muted-foreground"
                  data-testid="csv-data-table-empty"
                >
                  Upload a CSV to see insights.
                </td>
              </tr>
            ) : (
              txs.map((t, i) => (
                <tr
                  key={i}
                  className="border-t border-border/60 odd:bg-background/40 hover:bg-accent/30"
                  data-testid="csv-data-table-row"
                >
                  <td className="px-3 py-2 capitalize">{t.type}</td>
                  <td className="px-3 py-2 font-medium">{t.amount.toFixed(2)}</td>
                  <td className="px-3 py-2">{t.productName ?? '-'}</td>
                  <td className="px-3 py-2">{t.date ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
