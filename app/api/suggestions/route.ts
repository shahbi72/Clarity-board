import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server/auth'
import { getErrorMessage } from '@/lib/server/http-error'
import { getSuggestionsForUser } from '@/lib/server/suggestions'
import type { SuggestionsApiResponse, SuggestionsPayload } from '@/lib/types/data-pipeline'

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    const suggestions = await getSuggestionsForUser(userId)

    if (!suggestions.dataset) {
      const response: SuggestionsApiResponse = {
        datasetMeta: null,
        suggestionsPayload: null,
      }
      return NextResponse.json(response)
    }

    const { dataset, ...payload } = suggestions
    const response: SuggestionsApiResponse = {
      datasetMeta: dataset,
      suggestionsPayload: payload as SuggestionsPayload,
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
