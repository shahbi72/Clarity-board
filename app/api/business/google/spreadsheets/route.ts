import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ensureCurrentUser, getCurrentUserId } from '@/lib/server/auth'
import { jsonApiError } from '@/lib/server/api-response'
import { buildRateLimitKey, enforceRateLimit } from '@/lib/server/rate-limit'
import { listGoogleSpreadsheetsForUser } from '@/lib/server/business-sync/google'
import { getBusinessFeatureGate } from '@/lib/server/business-sync/subscription'

const QuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(''),
})

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId()
    await ensureCurrentUser(userId)
    const gate = await getBusinessFeatureGate(userId)

    if (!gate.allowed) {
      return NextResponse.json(
        {
          error: {
            code: gate.reason,
            message: gate.message ?? 'Business plan required.',
          },
        },
        { status: 402 }
      )
    }

    const rateLimitKey = buildRateLimitKey('business_google_spreadsheets', request, userId)
    enforceRateLimit(rateLimitKey, 30, 60_000)

    const parsed = QuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams))
    const items = await listGoogleSpreadsheetsForUser(userId, parsed.q)

    return NextResponse.json({ items })
  } catch (error) {
    return jsonApiError(error)
  }
}
