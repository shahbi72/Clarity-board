import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server/auth'
import { isDatabaseConnectivityError } from '@/lib/server/database-errors'
import { getActiveDatasetForUser } from '@/lib/server/datasets'
import { getErrorMessage, HttpError } from '@/lib/server/http-error'
import type { ActiveDatasetResponse } from '@/lib/types/data-pipeline'

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    const dataset = await getActiveDatasetForUser(userId)
    const response: ActiveDatasetResponse = { dataset }
    return NextResponse.json(response)
  } catch (error) {
    if (isDatabaseConnectivityError(error)) {
      const response: ActiveDatasetResponse = { dataset: null }
      return NextResponse.json(response)
    }

    const status = error instanceof HttpError ? error.status : 500
    return NextResponse.json({ error: getErrorMessage(error) }, { status })
  }
}
