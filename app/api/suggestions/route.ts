import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server/auth'
import { getErrorMessage } from '@/lib/server/http-error'
import { getSuggestionsForUser } from '@/lib/server/suggestions'
import type { SuggestionsResponse } from '@/lib/types/data-pipeline'

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    const suggestions = await getSuggestionsForUser(userId)
    const response: SuggestionsResponse = suggestions
    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
