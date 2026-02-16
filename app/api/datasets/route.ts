import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server/auth'
import { getDatasetsForUser } from '@/lib/server/datasets'
import { getErrorMessage } from '@/lib/server/http-error'
import type { DatasetsResponse } from '@/lib/types/data-pipeline'

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    const result = await getDatasetsForUser(userId)
    const response: DatasetsResponse = result
    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
