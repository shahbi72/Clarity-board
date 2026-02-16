import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server/auth'
import { getDashboardSummaryForUser } from '@/lib/server/dashboard-summary'
import { getErrorMessage } from '@/lib/server/http-error'
import type { DashboardSummaryResponse } from '@/lib/types/data-pipeline'

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(request.url)
    const datasetId = searchParams.get('datasetId') ?? undefined
    const summary = await getDashboardSummaryForUser(userId, datasetId)
    const response: DashboardSummaryResponse = summary
    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
