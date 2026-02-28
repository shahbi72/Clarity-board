import type { CleanRow, ColumnProfile } from '@/lib/reports/cleaning/engine'

export type KpiInference = {
  dateColumn: string | null
  revenueColumn: string | null
  costColumn: string | null
  ordersColumn: string | null
  profitColumn: string | null
  conversionRateColumn: string | null
  confidence: Record<string, number>
  derivedProfit: boolean
}

type ColumnScoring = {
  column: string
  score: number
  confidence: number
}

function matchScore(header: string, patterns: RegExp[]): number {
  const normalized = header.toLowerCase()

  for (let i = 0; i < patterns.length; i += 1) {
    if (patterns[i].test(normalized)) {
      return Math.max(0.3, 1 - i * 0.1)
    }
  }

  return 0
}

function completenessScore(rows: CleanRow[], header: string): number {
  if (!rows.length) {
    return 0
  }

  const nonNull = rows.reduce((acc, row) => (row[header] === null || row[header] === undefined ? acc : acc + 1), 0)
  return nonNull / rows.length
}

function scoreCandidates(params: {
  headers: string[]
  profiles: Record<string, ColumnProfile>
  rows: CleanRow[]
  patterns: RegExp[]
  expectedTypes: Array<ColumnProfile['type']>
}): ColumnScoring[] {
  const { headers, profiles, rows, patterns, expectedTypes } = params

  return headers
    .map((header) => {
      const profile = profiles[header]
      const nameScore = matchScore(header, patterns)
      const typeScore = expectedTypes.includes(profile?.type ?? 'unknown') ? 1 : 0
      const completeness = completenessScore(rows, header)
      const confidence = Number((nameScore * 0.7 + typeScore * 0.2 + completeness * 0.1).toFixed(2))

      return {
        column: header,
        score: confidence,
        confidence,
      }
    })
    .sort((a, b) => b.score - a.score)
}

function pickColumn(scored: ColumnScoring[], threshold = 0.45): ColumnScoring | null {
  if (!scored.length) {
    return null
  }

  return scored[0].score >= threshold ? scored[0] : null
}

export function inferKpis(params: {
  headers: string[]
  rows: CleanRow[]
  profiles: Record<string, ColumnProfile>
}): KpiInference {
  const { headers, rows, profiles } = params

  const date = pickColumn(
    scoreCandidates({
      headers,
      profiles,
      rows,
      patterns: [/^date$/, /date|day|time|month|week|created|timestamp/],
      expectedTypes: ['date', 'string'],
    }),
    0.4
  )

  const revenue = pickColumn(
    scoreCandidates({
      headers,
      profiles,
      rows,
      patterns: [/^revenue$/, /^sales$/, /revenue|sales|gmv|income|amount/],
      expectedTypes: ['number'],
    })
  )

  const cost = pickColumn(
    scoreCandidates({
      headers,
      profiles,
      rows,
      patterns: [/^cost$/, /^spend$/, /cost|spend|expense|cogs/],
      expectedTypes: ['number'],
    })
  )

  const orders = pickColumn(
    scoreCandidates({
      headers,
      profiles,
      rows,
      patterns: [/^orders$/, /^transactions$/, /orders?|transactions?|quantity|units/],
      expectedTypes: ['number'],
    }),
    0.35
  )

  const profit = pickColumn(
    scoreCandidates({
      headers,
      profiles,
      rows,
      patterns: [/^profit$/, /profit|margin/],
      expectedTypes: ['number'],
    })
  )

  const conversion = pickColumn(
    scoreCandidates({
      headers,
      profiles,
      rows,
      patterns: [/^conversion_rate$/, /^cvr$/, /conversion|conv_rate|cvr|ctr/],
      expectedTypes: ['number'],
    }),
    0.35
  )

  const derivedProfit = !profit && Boolean(revenue && cost)

  return {
    dateColumn: date?.column ?? null,
    revenueColumn: revenue?.column ?? null,
    costColumn: cost?.column ?? null,
    ordersColumn: orders?.column ?? null,
    profitColumn: profit?.column ?? null,
    conversionRateColumn: conversion?.column ?? null,
    derivedProfit,
    confidence: {
      dateColumn: date?.confidence ?? 0,
      revenueColumn: revenue?.confidence ?? 0,
      costColumn: cost?.confidence ?? 0,
      ordersColumn: orders?.confidence ?? 0,
      profitColumn: profit?.confidence ?? 0,
      conversionRateColumn: conversion?.confidence ?? 0,
    },
  }
}

