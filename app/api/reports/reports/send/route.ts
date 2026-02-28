import { z } from 'zod'
import { requireReportsAuthContext } from '@/lib/reports/auth/context'
import { sendReportForSchedule } from '@/lib/reports/reports/service'
import { parseJsonBody } from '@/lib/reports/server/api-error'
import { enforceRateLimit, rateLimitKey } from '@/lib/reports/server/rate-limit'
import { jsonOk, withApiHandler } from '@/lib/reports/server/route'

const bodySchema = z.object({
  sheetSourceId: z.string().nullable().optional(),
  recipientEmail: z.string().email().nullable().optional(),
})

export async function POST(request: Request): Promise<Response> {
  return withApiHandler(async () => {
    const auth = await requireReportsAuthContext()
    enforceRateLimit(rateLimitKey(request, 'reports_send_manual', auth.userId), 8, 60_000)

    const payload = await parseJsonBody(request, bodySchema)

    const result = await sendReportForSchedule({
      workspaceId: auth.workspaceId,
      userId: auth.userId,
      sheetSourceId: payload.sheetSourceId,
      recipientEmail: payload.recipientEmail,
      reportType: 'MANUAL',
    })

    return jsonOk({ data: result })
  })
}

