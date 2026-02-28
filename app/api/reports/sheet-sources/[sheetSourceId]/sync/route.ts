import { z } from 'zod'
import { requireReportsAuthContext } from '@/lib/reports/auth/context'
import { syncSheetSource } from '@/lib/reports/ingestion/sync'
import { parseQuery } from '@/lib/reports/server/api-error'
import { enforceRateLimit, rateLimitKey } from '@/lib/reports/server/rate-limit'
import { jsonOk, withApiHandler } from '@/lib/reports/server/route'
import { getBillingGate } from '@/lib/reports/server/tenancy'

const paramsSchema = z.object({
  sheetSourceId: z.string().min(1).max(50),
})

export async function POST(
  request: Request,
  context: { params: Promise<{ sheetSourceId: string }> }
): Promise<Response> {
  return withApiHandler(async () => {
    const auth = await requireReportsAuthContext()
    enforceRateLimit(rateLimitKey(request, 'reports_sheet_sync_manual', auth.userId), 12, 60_000)
    const gate = await getBillingGate(auth.userId)
    if (!gate.allowed) {
      return jsonOk({ data: { paywalled: true, gate } }, { status: 402 })
    }

    const { sheetSourceId } = parseQuery(paramsSchema, await context.params)

    const result = await syncSheetSource({
      sheetSourceId,
      userId: auth.userId,
      workspaceId: auth.workspaceId,
      triggeredBy: 'MANUAL',
    })

    return jsonOk({ data: result })
  })
}

