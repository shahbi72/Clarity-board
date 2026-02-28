import { z } from 'zod'
import { requireReportsAuthContext } from '@/lib/reports/auth/context'
import { getGoogleConnection, listSpreadsheetTabs } from '@/lib/reports/google/client'
import { parseQuery } from '@/lib/reports/server/api-error'
import { enforceRateLimit, rateLimitKey } from '@/lib/reports/server/rate-limit'
import { jsonOk, withApiHandler } from '@/lib/reports/server/route'

const paramsSchema = z.object({
  spreadsheetId: z.string().min(1).max(200),
})

export async function GET(
  request: Request,
  context: { params: Promise<{ spreadsheetId: string }> }
): Promise<Response> {
  return withApiHandler(async () => {
    const auth = await requireReportsAuthContext()
    enforceRateLimit(rateLimitKey(request, 'reports_google_sheets', auth.userId), 60, 60_000)

    const params = parseQuery(paramsSchema, await context.params)
    const connection = await getGoogleConnection(auth.workspaceId, auth.userId)
    const sheets = await listSpreadsheetTabs({
      connectionId: connection.id,
      spreadsheetId: params.spreadsheetId,
    })

    return jsonOk({ data: sheets })
  })
}

