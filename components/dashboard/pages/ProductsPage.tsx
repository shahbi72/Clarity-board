'use client'

import { useMemo, useState } from 'react'
import {
  formatCurrency,
  productIdentity,
  useDashboardData,
} from '@/components/dashboard/dashboard-data-provider'
import { DashboardPageState } from '@/components/dashboard/pages/DashboardPageState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const CARD_CLASS = 'bg-white rounded-2xl shadow-sm border border-[#d9e1ef]'

type ProductSortKey =
  | 'productName'
  | 'revenue'
  | 'orders'
  | 'unitsSold'
  | 'revenueDeltaPct'
  | 'refunds'
  | 'health'

type ProductRow = {
  key: string
  productName: string
  revenue: number
  orders: number
  unitsSold: number
  revenueDeltaPct: number
  refunds: number
  health: 'Healthy' | 'Watch' | 'Declining' | 'Dead Stock'
}

export function ProductsPage() {
  const { summary, topProductsWithProfit, deadStockItems } = useDashboardData()
  const [sortKey, setSortKey] = useState<ProductSortKey>('revenue')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const rows = useMemo<ProductRow[]>(() => {
    if (!summary) {
      return []
    }

    const grossRevenue = Math.max(summary.totals.totalRevenue + summary.totals.totalRefunded, 1)
    const unitsSoldBase = Math.max(summary.totals.totalUnitsSold, 1)
    const declineMap = new Map(
      summary.comparison7d.topSkuDeclines.map((item) => [
        `${(item.sku ?? '').trim().toLowerCase()}::${item.productName.trim().toLowerCase()}`,
        item.deltaPct,
      ])
    )
    const deadStockSet = new Set(deadStockItems.map((item) => deadStockIdentity(item)))

    return topProductsWithProfit.map((product) => {
      const key = productIdentity(product)
      const revenueDeltaPct = declineMap.get(key) ?? 0
      const orders = Math.round(summary.totals.totalOrders * (product.unitsSold / unitsSoldBase))
      const refunds = summary.totals.totalRefunded * (product.revenue / grossRevenue)

      let health: ProductRow['health'] = 'Healthy'
      if (deadStockSet.has(key)) {
        health = 'Dead Stock'
      } else if (revenueDeltaPct <= -0.15) {
        health = 'Declining'
      } else if (product.marginPct != null && product.marginPct < 0.25) {
        health = 'Watch'
      }

      return {
        key,
        productName: product.productName,
        revenue: product.revenue,
        orders,
        unitsSold: product.unitsSold,
        revenueDeltaPct,
        refunds,
        health,
      }
    })
  }, [deadStockItems, summary, topProductsWithProfit])

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1
      const aValue = a[sortKey]
      const bValue = b[sortKey]

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * direction
      }

      return ((aValue as number) - (bValue as number)) * direction
    })
    return sorted
  }, [rows, sortDirection, sortKey])

  function onSort(nextKey: ProductSortKey) {
    if (nextKey === sortKey) {
      setSortDirection((value) => (value === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(nextKey)
    setSortDirection('desc')
  }

  return (
    <DashboardPageState>
      <div className="space-y-6">
        <Card className={CARD_CLASS}>
          <CardHeader>
            <CardTitle className="text-[#1b2540]">SKU Performance</CardTitle>
            <CardDescription className="text-[#6b7a99]">
              Sort by any column to inspect winners and declining products.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#d9e1ef] text-[#6b7a99]">
                    <SortableHeader label="Product" onClick={() => onSort('productName')} />
                    <SortableHeader label="Revenue" onClick={() => onSort('revenue')} />
                    <SortableHeader label="Orders" onClick={() => onSort('orders')} />
                    <SortableHeader label="Units Sold" onClick={() => onSort('unitsSold')} />
                    <SortableHeader label="Revenue Delta %" onClick={() => onSort('revenueDeltaPct')} />
                    <SortableHeader label="Refunds" onClick={() => onSort('refunds')} />
                    <SortableHeader label="Health" onClick={() => onSort('health')} />
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => (
                    <tr
                      key={row.key}
                      className={`border-b border-[#e5ebf5] ${
                        row.health === 'Declining' ? 'bg-[#f59e0b]/10' : 'bg-transparent'
                      }`}
                    >
                      <td className="px-2 py-3 text-[#1b2540]">{row.productName}</td>
                      <td className="px-2 py-3 text-[#1b2540]">{formatCurrency(row.revenue)}</td>
                      <td className="px-2 py-3 text-[#1b2540]">{row.orders.toLocaleString()}</td>
                      <td className="px-2 py-3 text-[#1b2540]">{row.unitsSold.toLocaleString()}</td>
                      <td
                        className={`px-2 py-3 font-medium ${
                          row.revenueDeltaPct < 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'
                        }`}
                      >
                        {(row.revenueDeltaPct * 100).toFixed(1)}%
                      </td>
                      <td className="px-2 py-3 text-[#1b2540]">{formatCurrency(row.refunds)}</td>
                      <td className="px-2 py-3">
                        <span className={healthBadgeClass(row.health)}>{row.health}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className={`${CARD_CLASS} border-[#f59e0b]/50 bg-[#f59e0b]/10`}>
          <CardHeader>
            <CardTitle className="text-[#1b2540]">Dead Stock Alert</CardTitle>
            <CardDescription className="text-[#6b7a99]">
              Products with 0 orders in 30 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {deadStockItems.length === 0 ? (
              <p className="text-sm text-[#6b7a99]">No dead stock currently detected.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#f59e0b]/40 text-[#6b7a99]">
                      <th className="px-2 py-2 font-medium">Product</th>
                      <th className="px-2 py-2 font-medium">Last Order Date</th>
                      <th className="px-2 py-2 font-medium">Units Sold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deadStockItems.map((item) => (
                      <tr key={deadStockIdentity(item)} className="border-b border-[#f59e0b]/20">
                        <td className="px-2 py-3 text-[#1b2540]">{item.productName}</td>
                        <td className="px-2 py-3 text-[#1b2540]">{item.lastOrderDate}</td>
                        <td className="px-2 py-3 text-[#1b2540]">{item.totalUnitsSold.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardPageState>
  )
}

function SortableHeader({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <th className="px-2 py-2 font-medium">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-left text-[#6b7a99] hover:text-[#1b2540]"
        onClick={onClick}
      >
        {label}
      </button>
    </th>
  )
}

function healthBadgeClass(health: ProductRow['health']): string {
  if (health === 'Healthy') {
    return 'rounded-full bg-[#22c55e]/10 px-2 py-1 text-xs font-semibold text-[#22c55e]'
  }
  if (health === 'Watch') {
    return 'rounded-full bg-[#f59e0b]/10 px-2 py-1 text-xs font-semibold text-[#f59e0b]'
  }
  if (health === 'Declining') {
    return 'rounded-full bg-[#f59e0b]/15 px-2 py-1 text-xs font-semibold text-[#f59e0b]'
  }
  return 'rounded-full bg-[#ef4444]/10 px-2 py-1 text-xs font-semibold text-[#ef4444]'
}

function deadStockIdentity(item: { productName: string; sku: string | null }): string {
  return `${(item.sku ?? '').trim().toLowerCase()}::${item.productName.trim().toLowerCase()}`
}
