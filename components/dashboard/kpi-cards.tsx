'use client'

import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  PiggyBank,
  AlertTriangle,
  Calendar,
  CalendarDays,
  CalendarRange,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { KPIData } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

interface KPICardsProps {
  data: KPIData
  timeFilter: string
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export function KPICards({ data, timeFilter }: KPICardsProps) {
  const mainKPIs = [
    {
      title: 'Total Revenue',
      value: data.totalRevenue,
      change: data.revenueChange,
      icon: DollarSign,
      trend: data.revenueChange >= 0 ? 'up' : 'down',
      tone: 'from-primary/15 via-white to-white',
    },
    {
      title: 'Total Expenses',
      value: data.totalExpenses,
      change: data.expensesChange,
      icon: Receipt,
      trend: data.expensesChange <= 0 ? 'up' : 'down',
      tone: 'from-amber-100/70 via-white to-white',
    },
    {
      title: 'Total Profit',
      value: data.totalProfit,
      change: data.profitChange,
      icon: PiggyBank,
      trend: data.profitChange >= 0 ? 'up' : 'down',
      tone: 'from-blue-100/70 via-white to-white',
    },
    {
      title: 'Total Loss',
      value: data.totalLoss,
      change: -2.4,
      icon: AlertTriangle,
      trend: 'down',
      isNegative: true,
      tone: 'from-rose-100/70 via-white to-white',
    },
  ]

  const periodKPIs = [
    {
      title: "Today's Revenue",
      value: data.todayRevenue,
      icon: Calendar,
    },
    {
      title: "Today's Expenses",
      value: data.todayExpenses,
      icon: Calendar,
    },
    {
      title: 'Weekly Profit',
      value: data.weeklyProfit,
      icon: CalendarDays,
    },
    {
      title: 'Monthly Profit',
      value: data.monthlyProfit,
      icon: CalendarRange,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {mainKPIs.map((kpi) => (
          <Card
            key={kpi.title}
            className={cn(
              'relative overflow-hidden border border-border/60 bg-gradient-to-br elite-card',
              kpi.tone,
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <div className={`icon-chip h-9 w-9 ${kpi.isNegative ? 'icon-chip-accent' : 'icon-chip-primary'}`}>
                <kpi.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(kpi.value)}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs">
                {kpi.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-primary" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span className={kpi.trend === 'up' ? 'text-primary' : 'text-destructive'}>
                  {formatPercentage(kpi.change)}
                </span>
                <span className="text-muted-foreground">vs last {timeFilter}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Period KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {periodKPIs.map((kpi) => (
          <Card key={kpi.title} className="border border-border/60 bg-card elite-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <span className="icon-chip icon-chip-muted h-8 w-8">
                <kpi.icon className="h-4 w-4" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold text-foreground">
                {formatCurrency(kpi.value)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
