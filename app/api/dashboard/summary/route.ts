import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server/auth'
import {
  createEmptyDashboardSummary,
  getDashboardSummaryForUser,
} from '@/lib/server/dashboard-summary'
import { isDatabaseConnectivityError } from '@/lib/server/database-errors'
import { getErrorMessage, HttpError } from '@/lib/server/http-error'
import type { DashboardSummaryResponse } from '@/lib/types/data-pipeline'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(request.url)
    const activeDatasetId = searchParams.get('activeDatasetId')
    const from = parseDateParam(searchParams.get('from'), false)
    const to = parseDateParam(searchParams.get('to'), true)
    const summary = await getDashboardSummaryForUser(userId, activeDatasetId, { from, to })
    const response: DashboardSummaryResponse = summary
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("Dashboard summary error:", error);

    return Response.json(
      {
        error: "Unable to initialize user data",
        debug: {
          name: error?.name,
          code: error?.code,
          message: error?.message
        }
      },
      { status: 500 }
    );
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
