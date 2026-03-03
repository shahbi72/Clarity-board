'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  formatCurrency,
  healthLabelClass,
  severityBadgeClass,
  useDashboardData,
} from '@/components/dashboard/dashboard-data-provider'
import { DashboardPageState } from '@/components/dashboard/pages/DashboardPageState'
import { ShopifyAiCopilot } from '@/components/shopify/shopify-ai-copilot'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const CARD_CLASS = 'bg-white rounded-2xl shadow-sm border border-[#d9e1ef]'

function KpiCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="pb-2">
        <CardDescription className="text-[#6b7a99]">{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight text-[#1b2540]">{value}</p>
        {hint ? <p className="mt-1 text-xs text-[#6b7a99]">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}

export function OverviewPage() {
  const {
    summary,
    storeHealth,
    headlineInsights,
    isDemoMode,
    viewState,
    effectivePlan,
    copilotContext,
  } = useDashboardData()
  const [copilotOpen, setCopilotOpen] = useState(false)

  const sparklineData = useMemo(() => (summary ? summary.trend.slice(-7) : []), [summary])
  const alertPreview = useMemo(() => headlineInsights.slice(0, 3), [headlineInsights])

  return (
    <DashboardPageState>
      {summary ? (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard title="Revenue" value={formatCurrency(summary.totals.totalRevenue)} />
            <KpiCard title="Orders" value={summary.totals.totalOrders.toLocaleString()} />
            <KpiCard title="AOV" value={formatCurrency(summary.totals.averageOrderValue)} />
            <KpiCard title="Units Sold" value={summary.totals.totalUnitsSold.toLocaleString()} />
            <KpiCard
              title="Health Score"
              value={storeHealth ? `${storeHealth.score}` : 'N/A'}
              hint={storeHealth ? storeHealth.label : 'No score yet'}
            />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
            <Card className={CARD_CLASS}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-[#1b2540]">Top Alerts</CardTitle>
                  <CardDescription className="text-[#6b7a99]">
                    Quick signal preview from your latest data.
                  </CardDescription>
                </div>
                <Link href="/dashboard/insights" className="text-sm font-medium text-[#4285f4]">
                  View all alerts →
                </Link>
              </CardHeader>
              <CardContent>
                {alertPreview.length === 0 ? (
                  <p className="text-sm text-[#6b7a99]">No alerts right now.</p>
                ) : (
                  <div className="space-y-3">
                    {alertPreview.map((item) => (
                      <article key={item.type} className="rounded-xl border border-[#d9e1ef] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[#1b2540]">{item.title}</p>
                          <span className={severityBadgeClass(item.severity)}>{item.severity}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-[#6b7a99]">{item.body}</p>
                      </article>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={CARD_CLASS}>
              <CardHeader>
                <CardTitle className="text-[#1b2540]">Revenue Sparkline</CardTitle>
                <CardDescription className="text-[#6b7a99]">Last 7 days</CardDescription>
              </CardHeader>
              <CardContent className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Line type="monotone" dataKey="revenue" stroke="#4285f4" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                {storeHealth ? (
                  <p className={`mt-3 text-sm font-medium ${healthLabelClass(storeHealth.label)}`}>
                    {storeHealth.label}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </section>

          <Card className={CARD_CLASS}>
            <CardHeader
              className="cursor-pointer"
              onClick={() => {
                setCopilotOpen((value) => !value)
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-[#1b2540]">AI Copilot</CardTitle>
                  <CardDescription className="text-[#6b7a99]">
                    Click to {copilotOpen ? 'collapse' : 'expand'} inline chat.
                  </CardDescription>
                </div>
                {copilotOpen ? (
                  <ChevronUp className="h-4 w-4 text-[#6b7a99]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[#6b7a99]" />
                )}
              </div>
            </CardHeader>
            {copilotOpen ? (
              <CardContent>
                <ShopifyAiCopilot
                  isDemoMode={isDemoMode}
                  paywalled={viewState.paywalled}
                  plan={effectivePlan}
                  contextPacket={copilotContext}
                />
              </CardContent>
            ) : null}
          </Card>
        </div>
      ) : null}
    </DashboardPageState>
  )
}
