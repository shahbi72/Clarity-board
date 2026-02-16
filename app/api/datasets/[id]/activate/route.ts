import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server/auth'
import { activateDatasetForUser } from '@/lib/server/datasets'
import { getErrorMessage, HttpError } from '@/lib/server/http-error'

type RouteParams = {
  id: string
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const userId = await getCurrentUserId()
    const params = await context.params
    await activateDatasetForUser(userId, params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status }
    )
  }
}
