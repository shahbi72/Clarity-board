'use client'

import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency, useDashboardData } from '@/components/dashboard/dashboard-data-provider'
import { DashboardPageState } from '@/components/dashboard/pages/DashboardPageState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const CARD_CLASS = 'bg-white rounded-2xl shadow-sm border border-[#d9e1ef]'

type TrendWindow = 7 | 30 | 90

export function TrendsPage() {
  const { summary, trendPoints, rangeDays, setRangeDays, ordersByDay, ordersByHour } = useDashboardData()
  const [windowDays, setWindowDays] = useState<TrendWindow>(rangeDays)

  function selectWindow(next: TrendWindow) {
    setWindowDays(next)
    if (next === 90) {
      setRangeDays(30)
      return
    }
    setRangeDays(next)
  }

  return (
    <DashboardPageState>
      {summary ? (
        <div className="space-y-6">
          <Card className={CARD_CLASS}>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-[#1b2540]">Revenue Trend</CardTitle>
                <CardDescription className="text-[#6b7a99]">
                  Time-based revenue analysis with 7 / 30 / 90 day toggle.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {[7, 30, 90].map((item) => (
                  <Button
                    key={item}
                    size="sm"
                    onClick={() => selectWindow(item as TrendWindow)}
                    className={
                      windowDays === item
                        ? 'bg-[#4285f4] text-white hover:bg-[#4285f4]/90'
                        : 'bg-white text-[#1b2540] hover:bg-white/90'
                    }
                  >
                    {item}d
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendPoints}>
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7a99' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7a99' }} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="revenue" stroke="#4285f4" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              {windowDays === 90 ? (
                <p className="mt-2 text-xs text-[#6b7a99]">
                  90-day mode currently shows the latest available synced window.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className={CARD_CLASS}>
              <CardHeader>
                <CardTitle className="text-[#1b2540]">Best Day of Week</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ordersByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6b7a99' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7a99' }} />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#4285f4" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className={CARD_CLASS}>
              <CardHeader>
                <CardTitle className="text-[#1b2540]">Best Hour of Day</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ordersByHour}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7a99' }} interval={2} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7a99' }} />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#4285f4" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className={CARD_CLASS}>
            <CardContent className="pt-6">
              <p className="text-sm text-[#1b2540]">
                Your customers buy most on{' '}
                <span className="font-semibold">{summary.salesTiming.bestDay ?? 'N/A'}</span> around{' '}
                <span className="font-semibold">{summary.salesTiming.bestHour ?? 'N/A'}</span>.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </DashboardPageState>
  )
}
