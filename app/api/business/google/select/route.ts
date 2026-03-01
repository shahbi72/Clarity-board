import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ensureCurrentUser, getCurrentUserId } from '@/lib/server/auth'
import { jsonApiError } from '@/lib/server/api-response'
import { writeAuditLog } from '@/lib/server/audit-log'
import { saveGoogleSheetSelection } from '@/lib/server/business-sync/google'
import { getBusinessFeatureGate } from '@/lib/server/business-sync/subscription'
import { buildRateLimitKey, enforceRateLimit } from '@/lib/server/rate-limit'

const BodySchema = z.object({
  spreadsheetId: z.string().trim().min(1).max(200),
  spreadsheetName: z.string().trim().min(1).max(200),
  sheetName: z.string().trim().min(1).max(200),
})

export async function POST(request: Request) {
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

    const rateLimitKey = buildRateLimitKey('business_sheet_select', request, userId)
    enforceRateLimit(rateLimitKey, 15, 60_000)

    const payload = BodySchema.parse(await request.json())

    await saveGoogleSheetSelection({
      userId,
      spreadsheetId: payload.spreadsheetId,
      spreadsheetName: payload.spreadsheetName,
      sheetName: payload.sheetName,
    })

    await writeAuditLog({
      userId,
      action: 'business.google.select_sheet',
      resourceType: 'sheet_connection',
      metadata: {
        spreadsheetId: payload.spreadsheetId,
        spreadsheetName: payload.spreadsheetName,
        sheetName: payload.sheetName,
      },
      request,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return jsonApiError(error)
  }
}
