import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ensureCurrentUser, getCurrentUserId } from '@/lib/server/auth'
import { jsonApiError } from '@/lib/server/api-response'
import { buildRateLimitKey, enforceRateLimit } from '@/lib/server/rate-limit'
import { getBusinessFeatureGate } from '@/lib/server/business-sync/subscription'
import { listGoogleSheetTabsForUser } from '@/lib/server/business-sync/google'

const ParamsSchema = z.object({
  spreadsheetId: z.string().trim().min(1).max(200),
})

export async function GET(
  request: Request,
  context: { params: Promise<{ spreadsheetId: string }> }
) {
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

    const rateLimitKey = buildRateLimitKey('business_google_sheets', request, userId)
    enforceRateLimit(rateLimitKey, 30, 60_000)

    const params = ParamsSchema.parse(await context.params)
    const items = await listGoogleSheetTabsForUser({
      userId,
      spreadsheetId: params.spreadsheetId,
    })

    return NextResponse.json({ items })
  } catch (error) {
    return jsonApiError(error)
  }
}
