'use client'

import {
  formatCurrency,
  productIdentity,
  useDashboardData,
} from '@/components/dashboard/dashboard-data-provider'
import { DashboardPageState } from '@/components/dashboard/pages/DashboardPageState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const CARD_CLASS = 'bg-white rounded-2xl shadow-sm border border-[#d9e1ef]'

export function ProfitPage() {
  const {
    topProducts,
    feePercentInput,
    setFeePercentInput,
    fixedFeePerOrderInput,
    setFixedFeePerOrderInput,
    averageShippingPerOrderInput,
    setAverageShippingPerOrderInput,
    productCostInputs,
    setProductCostInput,
    profitEstimate,
    estimatedProfitValue,
  } = useDashboardData()

  return (
    <DashboardPageState>
      <div className="space-y-6">
        <Card className={CARD_CLASS}>
          <CardHeader>
            <CardDescription className="text-[#6b7a99]">Total estimated profit</CardDescription>
            <CardTitle className="text-3xl text-[#1b2540]">
              {estimatedProfitValue != null ? formatCurrency(estimatedProfitValue) : 'Add cost inputs'}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className={CARD_CLASS}>
          <CardHeader>
            <CardTitle className="text-[#1b2540]">Profit Inputs</CardTitle>
            <CardDescription className="text-[#6b7a99]">
              Fee %, fixed fee per order, and average shipping per order.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm text-[#1b2540]">
              <span className="text-[#6b7a99]">Fee %</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={feePercentInput}
                onChange={(event) => setFeePercentInput(event.target.value)}
                className="h-10 w-full rounded-lg border border-[#d9e1ef] bg-white px-3"
              />
            </label>
            <label className="space-y-1 text-sm text-[#1b2540]">
              <span className="text-[#6b7a99]">Fixed fee per order</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={fixedFeePerOrderInput}
                onChange={(event) => setFixedFeePerOrderInput(event.target.value)}
                className="h-10 w-full rounded-lg border border-[#d9e1ef] bg-white px-3"
              />
            </label>
            <label className="space-y-1 text-sm text-[#1b2540]">
              <span className="text-[#6b7a99]">Avg shipping per order</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={averageShippingPerOrderInput}
                onChange={(event) => setAverageShippingPerOrderInput(event.target.value)}
                className="h-10 w-full rounded-lg border border-[#d9e1ef] bg-white px-3"
                placeholder="e.g. 4.25"
              />
            </label>
          </CardContent>
        </Card>

        <Card className={CARD_CLASS}>
          <CardHeader>
            <CardTitle className="text-[#1b2540]">Per-product COGS Inputs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#d9e1ef] text-[#6b7a99]">
                    <th className="px-2 py-2 font-medium">Product</th>
                    <th className="px-2 py-2 font-medium">Units Sold</th>
                    <th className="px-2 py-2 font-medium">COGS / Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product) => {
                    const key = productIdentity(product)
                    return (
                      <tr key={key} className="border-b border-[#e5ebf5]">
                        <td className="px-2 py-3 text-[#1b2540]">{product.productName}</td>
                        <td className="px-2 py-3 text-[#1b2540]">{product.unitsSold.toLocaleString()}</td>
                        <td className="px-2 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={productCostInputs[key] ?? ''}
                            onChange={(event) => setProductCostInput(key, event.target.value)}
                            className="h-9 w-full rounded-lg border border-[#d9e1ef] px-2 text-[#1b2540]"
                            placeholder="Optional"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className={CARD_CLASS}>
          <CardHeader>
            <CardTitle className="text-[#1b2540]">Profit Results</CardTitle>
            <CardDescription className="text-[#6b7a99]">
              Product revenue, COGS, fees, shipping, gross profit, and margin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!profitEstimate ? (
              <p className="text-sm text-[#6b7a99]">
                Enter at least one fee, shipping, or COGS input to generate results.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#d9e1ef] text-[#6b7a99]">
                      <th className="px-2 py-2 font-medium">Product</th>
                      <th className="px-2 py-2 font-medium">Revenue</th>
                      <th className="px-2 py-2 font-medium">COGS</th>
                      <th className="px-2 py-2 font-medium">Fees</th>
                      <th className="px-2 py-2 font-medium">Shipping</th>
                      <th className="px-2 py-2 font-medium">Gross Profit</th>
                      <th className="px-2 py-2 font-medium">Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profitEstimate.products.map((row) => (
                      <tr key={row.key} className="border-b border-[#e5ebf5]">
                        <td className="px-2 py-3 text-[#1b2540]">{row.productName}</td>
                        <td className="px-2 py-3 text-[#1b2540]">{formatCurrency(row.revenue)}</td>
                        <td className="px-2 py-3 text-[#1b2540]">{formatCurrency(row.cogs)}</td>
                        <td className="px-2 py-3 text-[#1b2540]">{formatCurrency(row.fees)}</td>
                        <td className="px-2 py-3 text-[#1b2540]">{formatCurrency(row.shipping)}</td>
                        <td className="px-2 py-3 font-medium text-[#1b2540]">
                          {formatCurrency(row.estimatedProfit)}
                        </td>
                        <td className="px-2 py-3 text-[#1b2540]">
                          {row.marginPct != null ? `${(row.marginPct * 100).toFixed(1)}%` : 'N/A'}
                        </td>
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
