'use client'

import { useMemo, useState } from 'react'
import { Filter } from 'lucide-react'
import {
  formatDateTime,
  severityBadgeClass,
  useDashboardData,
} from '@/components/dashboard/dashboard-data-provider'
import { DashboardPageState } from '@/components/dashboard/pages/DashboardPageState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

type InsightFilter = 'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'

const CARD_CLASS = 'bg-white rounded-2xl shadow-sm border border-[#d9e1ef]'

function extractPrimaryDriver(body: string): string {
  const line = body
    .split('\n')
    .find((entry) => entry.toLowerCase().startsWith('primary driver:'))
  return line?.replace(/primary driver:/i, '').trim() ?? 'See detail'
}

function extractSuggestedAction(body: string): string {
  const line = body
    .split('\n')
    .find((entry) => entry.toLowerCase().startsWith('suggested action:'))
  return line?.replace(/suggested action:/i, '').trim() ?? 'Review and monitor.'
}

function extractDeltaPercent(deltaJson: Record<string, unknown> | null): string {
  const value = deltaJson?.deltaPct
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'N/A'
  }
  return `${(value * 100).toFixed(1)}%`
}

function extractProductName(item: { title: string; deltaJson: Record<string, unknown> | null }): string {
  const candidate = item.deltaJson?.productName
  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate
  }
  return item.title
}

export function InsightsPage() {
  const {
    insights,
    loadingInsights,
    unreadCount,
    markAllInsightsRead,
    toggleInsightRead,
    businessStatus,
    businessError,
  } = useDashboardData()
  const [filter, setFilter] = useState<InsightFilter>('ALL')
  const [unreadOnly, setUnreadOnly] = useState(false)

  const filteredInsights = useMemo(() => {
    return insights.filter((item) => {
      if (unreadOnly && item.readAt) {
        return false
      }
      if (filter === 'ALL') {
        return true
      }
      return item.severity === filter
    })
  }, [filter, insights, unreadOnly])

  return (
    <DashboardPageState>
      <div className="space-y-6">
        <Card className={CARD_CLASS}>
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-[#1b2540]">What Changed / What Needs Attention</CardTitle>
                <CardDescription className="text-[#6b7a99]">
                  All alert signals in one place.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                className="border-[#d9e1ef] text-[#1b2540]"
                onClick={() => void markAllInsightsRead()}
                disabled={unreadCount === 0}
              >
                Mark all as read
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#d9e1ef] bg-[#eef2f7] p-2">
              <Filter className="ml-1 h-4 w-4 text-[#6b7a99]" />
              {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((item) => (
                <Button
                  key={item}
                  size="sm"
                  onClick={() => setFilter(item)}
                  className={
                    filter === item
                      ? 'bg-[#4285f4] text-white hover:bg-[#4285f4]/90'
                      : 'bg-white text-[#1b2540] hover:bg-white/90'
                  }
                >
                  {item === 'ALL' ? 'All' : item[0] + item.slice(1).toLowerCase()}
                </Button>
              ))}
              <div className="ml-auto flex items-center gap-2 px-2">
                <span className="text-sm text-[#6b7a99]">Unread only</span>
                <Switch checked={unreadOnly} onCheckedChange={setUnreadOnly} />
              </div>
            </div>

            {businessStatus && !businessStatus.eligible ? (
              <p className="text-sm text-[#6b7a99]">
                Business alerts are unavailable on your current plan. Upgrade to Business for synced
                insight events.
              </p>
            ) : null}

            {businessError ? <p className="text-sm text-[#ef4444]">{businessError}</p> : null}

            {loadingInsights ? (
              <p className="text-sm text-[#6b7a99]">Loading insights...</p>
            ) : filteredInsights.length === 0 ? (
              <p className="text-sm text-[#6b7a99]">No insights match this filter.</p>
            ) : (
              <div className="space-y-3">
                {filteredInsights.map((item) => (
                  <article
                    key={item.id}
                    className={cnInsightCard(item.readAt != null)}
                    data-testid={`insight-card-${item.id}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#1b2540]">{item.title}</p>
                      <span className={severityBadgeClass(item.severity)}>{item.severity}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-[#6b7a99] md:grid-cols-2">
                      <p>
                        <span className="font-medium text-[#1b2540]">Product:</span>{' '}
                        {extractProductName(item)}
                      </p>
                      <p>
                        <span className="font-medium text-[#1b2540]">% change:</span>{' '}
                        {extractDeltaPercent(item.deltaJson)}
                      </p>
                      <p>
                        <span className="font-medium text-[#1b2540]">Primary driver:</span>{' '}
                        {extractPrimaryDriver(item.body)}
                      </p>
                      <p>
                        <span className="font-medium text-[#1b2540]">Suggested action:</span>{' '}
                        {extractSuggestedAction(item.body)}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="text-xs text-[#6b7a99]">{formatDateTime(item.createdAt)}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#d9e1ef] text-[#1b2540]"
                        onClick={() => void toggleInsightRead(item.id)}
                      >
                        {item.readAt ? 'Mark as unread' : 'Mark as read'}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardPageState>
  )
}

function cnInsightCard(read: boolean): string {
  if (read) {
    return 'rounded-xl border border-[#d9e1ef] bg-white p-4 opacity-75'
  }
  return 'rounded-xl border border-[#4285f4]/40 bg-white p-4'
}
