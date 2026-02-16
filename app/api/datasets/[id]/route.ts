import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server/auth'
import { getDatasetDetailsForUser } from '@/lib/server/datasets'
import { getErrorMessage, HttpError } from '@/lib/server/http-error'
import type { DatasetDetailsResponse } from '@/lib/types/data-pipeline'

type RouteParams = {
  id: string
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const userId = await getCurrentUserId()
    const params = await context.params
    const details = await getDatasetDetailsForUser(userId, params.id, 50)
    const response: DatasetDetailsResponse = details
    return NextResponse.json(response)
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status }
    )
  }
}
