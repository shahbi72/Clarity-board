'use client'

import {
  ArrowDownRight,
  ArrowUpRight,
  type LucideIcon,
  Minus,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type KpiCardTone = 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate'

type KpiDelta = {
  value: number | null
  label: string
}

export interface KpiCardProps {
  title: string
  value: string
  icon: LucideIcon
  tone?: KpiCardTone
  delta?: KpiDelta
}

const TONE_CLASSES: Record<KpiCardTone, string> = {
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-100',
}

function formatDelta(value: number): string {
  const absValue = Math.abs(value)
  return `${value > 0 ? '+' : '-'}${absValue.toFixed(1)}%`
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  tone = 'slate',
  delta,
}: KpiCardProps) {
  const isPositive = typeof delta?.value === 'number' && delta.value > 0
  const isNegative = typeof delta?.value === 'number' && delta.value < 0

  return (
    <Card className="border-border/70 bg-card/90">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <span
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-lg',
            TONE_CLASSES[tone]
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        {delta ? (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            {isPositive ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
            ) : isNegative ? (
              <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span
              className={cn(
                'font-medium',
                isPositive && 'text-emerald-600 dark:text-emerald-300',
                isNegative && 'text-rose-600 dark:text-rose-300'
              )}
            >
              {typeof delta.value === 'number' ? formatDelta(delta.value) : 'n/a'}
            </span>
            <span>{delta.label}</span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
