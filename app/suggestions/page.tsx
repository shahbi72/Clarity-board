'use client'

import React from 'react'
import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Database,
  FileCheck2,
  Lightbulb,
  Loader2,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type {
  SuggestionsApiResponse,
  SuggestionsPayload,
} from '@/lib/types/data-pipeline'

const CHART_COLOR = '#2563eb'

export default function SuggestionsPage() {
  const [datasetMeta, setDatasetMeta] = React.useState<SuggestionsApiResponse['datasetMeta']>(null)
  const [suggestions, setSuggestions] = React.useState<SuggestionsPayload | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const loadSuggestions = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/suggestions', { cache: 'no-store' })
      const payload = (await response.json()) as SuggestionsApiResponse | { error?: string }
      if (!response.ok || !('datasetMeta' in payload)) {
        throw new Error(
          payload && typeof payload === 'object' && 'error' in payload
            ? payload.error || 'Failed to load smart suggestions.'
            : 'Failed to load smart suggestions.'
        )
      }

      setDatasetMeta(payload.datasetMeta)
      setSuggestions(payload.suggestionsPayload)
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'Failed to load smart suggestions.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadSuggestions()
  }, [loadSuggestions])

  return (
    <div className="min-h-full">
      <DashboardHeader
        title="Smart Suggestions"
        description="AI recommendations based on your active dataset"
      />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6">
        {isLoading ? (
          <Card className="min-h-56">
            <CardContent className="flex min-h-56 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading Smart Suggestions...
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardHeader>
              <CardTitle>Unable to Load Suggestions</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => void loadSuggestions()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : !datasetMeta ? (
          <Card className="border-dashed border-border/80 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-muted-foreground" />
                No Active Dataset
              </CardTitle>
              <CardDescription>
                Smart Suggestions runs only on your active dataset.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/datasets">
                  Go to Datasets
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : !suggestions ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              Suggestions are unavailable right now.
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="rounded-2xl border border-border/70 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    Smart Suggestions
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Analyst-style recommendations generated from your active dataset.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                    Active dataset: {datasetMeta.name}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => void loadSuggestions()}>
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    Refresh
                  </Button>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/70 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BadgeCheck className="h-4 w-4 text-blue-600" />
                    Executive Summary
                  </CardTitle>
                  <CardDescription>
                    Key findings from dataset {datasetMeta.name}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-foreground">
                    {suggestions.summary.bullets.map((bullet, index) => (
                      <li key={`${bullet}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileCheck2 className="h-4 w-4 text-blue-600" />
                    Data Quality Checks
                  </CardTitle>
                  <CardDescription>
                    Missing fields, duplicates, invalid dates, and outliers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <QualityStat label="Duplicates" value={suggestions.quality.duplicateCount} />
                    <QualityStat label="Invalid dates" value={suggestions.quality.invalidDates} />
                    <QualityStat label="Outliers" value={suggestions.quality.outlierCount} />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Missing Fields
                    </p>
                    {suggestions.quality.missingFields.length > 0 ? (
                      suggestions.quality.missingFields.slice(0, 4).map((field) => (
                        <div
                          key={field.column}
                          className="flex items-center justify-between rounded-lg border border-border/60 bg-slate-50 px-3 py-2 text-sm"
                        >
                          <span className="text-foreground">{field.column}</span>
                          <span className="text-muted-foreground">
                            {field.missingCount.toLocaleString()} missing ({(field.missingRate * 100).toFixed(1)}%)
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No missing field signal detected.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/70 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Trend Insights
                  </CardTitle>
                  <CardDescription>
                    MoM growth based on detected date + metric columns.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  {suggestions.trends.timeseries.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={suggestions.trends.timeseries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" />
                        <YAxis tickFormatter={(value) => compactCurrency(Number(value))} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={CHART_COLOR}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <ChartFallback message="Not enough date + metric data for monthly trend chart." />
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-blue-600" />
                    Top Categories
                  </CardTitle>
                  <CardDescription>
                    Highest contributing segments from your active dataset.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  {suggestions.topCategories.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={suggestions.topCategories}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" interval={0} angle={-16} height={60} textAnchor="end" />
                        <YAxis tickFormatter={(value) => compactCurrency(Number(value))} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Bar dataKey="value" fill={CHART_COLOR} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <ChartFallback message="Not enough category + metric data for category chart." />
                  )}
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="border-border/70 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="h-4 w-4 text-blue-600" />
                    Recommendations
                  </CardTitle>
                  <CardDescription>Actionable next steps from deterministic analytics.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-foreground">
                    {suggestions.recommendations.map((recommendation, index) => (
                      <li key={`${recommendation}-${index}`} className="rounded-lg border border-border/60 bg-slate-50 px-3 py-2">
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function QualityStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-slate-50 p-3">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold text-foreground">{value.toLocaleString()}</div>
    </div>
  )
}

function ChartFallback({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-slate-50 px-4 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function compactCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}
