import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server/auth'
import { isDatabaseConnectivityError } from '@/lib/server/database-errors'
import { getErrorMessage, HttpError } from '@/lib/server/http-error'
import { consumeAiInsightAllowanceForUser } from '@/lib/server/subscriptions'
import { getSuggestionsForUser } from '@/lib/server/suggestions'
import type { SuggestionsApiResponse, SuggestionsPayload } from '@/lib/types/data-pipeline'

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    const access = await consumeAiInsightAllowanceForUser(userId)
    const suggestions = await getSuggestionsForUser(userId)

    if (!suggestions.dataset) {
      const response: SuggestionsApiResponse = {
        datasetMeta: null,
        suggestionsPayload: null,
      }
      return NextResponse.json(response)
    }

    const { dataset, ...payload } = suggestions

    const payloadForPlan: SuggestionsPayload =
      access.plan === 'basic'
        ? {
            ...(payload as SuggestionsPayload),
            trends: {
              timeseries: [],
              momGrowthPct: null,
            },
            recommendations: [
              ...(payload as SuggestionsPayload).recommendations,
              'Upgrade to Pro to unlock forecasting and export capabilities.',
            ],
          }
        : (payload as SuggestionsPayload)

    const response: SuggestionsApiResponse = {
      datasetMeta: dataset,
      suggestionsPayload: payloadForPlan,
    }

    return NextResponse.json(response)
  } catch (error) {
    if (isDatabaseConnectivityError(error)) {
      const response: SuggestionsApiResponse = {
        datasetMeta: null,
        suggestionsPayload: null,
      }
      return NextResponse.json(response)
    }

    const status = error instanceof HttpError ? error.status : 500
    return NextResponse.json({ error: getErrorMessage(error) }, { status })
  }
}
