import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server/auth'
import { getDashboardSummaryForUser } from '@/lib/server/dashboard-summary'
import { getErrorMessage, HttpError } from '@/lib/server/http-error'
import type { DashboardSummaryResponse } from '@/lib/types/data-pipeline'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(request.url)
    const activeDatasetId = searchParams.get('activeDatasetId')
    const summary = await getDashboardSummaryForUser(userId, activeDatasetId)
    const response: DashboardSummaryResponse = summary
    return NextResponse.json(response)
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status }
    )
  }
}
