import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server/auth'
import { createEmptyDashboardSummary, getDashboardSummaryForUser } from '@/lib/server/dashboard-summary'
import { getErrorMessage, HttpError } from '@/lib/server/http-error'
import type { DashboardSummaryResponse } from '@/lib/types/data-pipeline'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId({ requireAuth: true })
    const { searchParams } = new URL(request.url)
    const activeDatasetId = searchParams.get('activeDatasetId')
    const from = parseDateParam(searchParams.get('from'), false)
    const to = parseDateParam(searchParams.get('to'), true)
    const summary = await getDashboardSummaryForUser(userId, activeDatasetId, { from, to })
    const response: DashboardSummaryResponse = summary ?? createEmptyDashboardSummary()
    return NextResponse.json(response)
  } catch (error) {
    const rawMessage = getErrorMessage(error)
    const isAuthRequired = rawMessage.toLowerCase().includes('authentication required')
    const status = error instanceof HttpError ? error.status : isAuthRequired ? 401 : 500
    const errorCode =
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (typeof (error as { code?: unknown }).code === 'string' ||
        typeof (error as { code?: unknown }).code === 'number')
        ? String((error as { code: string | number }).code)
        : null
    const message = sanitizePotentialSecrets(rawMessage)
    const stackTop = sanitizePotentialSecrets(getErrorStackTop(error) ?? '')

    console.error('Dashboard summary error:', {
      name: error instanceof Error ? error.name : null,
      code: errorCode,
      message,
      stackTop: stackTop || null,
    })

    return NextResponse.json(
      {
        error: message,
        debug: {
          name: error instanceof Error ? error.name : null,
          code: errorCode,
          message,
          stackTop: stackTop || null,
        },
      },
      { status }
    )
  }
}

function parseDateParam(value: string | null, isEndOfDay: boolean): Date | null {
  if (!value) return null

  const normalized = value.trim()
  if (!normalized) return null

  const hasDateOnlyFormat = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
  const parsed = hasDateOnlyFormat
    ? new Date(`${normalized}T00:00:00.000Z`)
    : new Date(normalized)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  if (!isEndOfDay) {
    return new Date(
      Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0)
    )
  }

  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 23, 59, 59, 999)
  )
}

function sanitizePotentialSecrets(value: string): string {
  return value
    .replace(/(postgres(?:ql)?:\/\/[^:\s]+:)[^@/\s]+@/gi, '$1***@')
    .replace(/([?&]password=)[^&\s]+/gi, '$1***')
}

function getErrorStackTop(error: unknown): string | null {
  if (!(error instanceof Error) || !error.stack) {
    return null
  }

  const topFrames = error.stack
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)

  if (topFrames.length === 0) {
    return null
  }

  return topFrames.join(' | ')
}
