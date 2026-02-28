import { z } from 'zod'
import { requireReportsAuthContext } from '@/lib/reports/auth/context'
import { getGoogleConnection, listSpreadsheets } from '@/lib/reports/google/client'
import { parseQuery } from '@/lib/reports/server/api-error'
import { enforceRateLimit, rateLimitKey } from '@/lib/reports/server/rate-limit'
import { jsonOk, withApiHandler } from '@/lib/reports/server/route'

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export async function GET(request: Request): Promise<Response> {
  return withApiHandler(async () => {
    const auth = await requireReportsAuthContext()

    enforceRateLimit(rateLimitKey(request, 'reports_google_spreadsheets', auth.userId), 40, 60_000)

    const url = new URL(request.url)
    const parsed = parseQuery(querySchema, {
      q: url.searchParams.get('q') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    })

    const connection = await getGoogleConnection(auth.workspaceId, auth.userId)
    const items = await listSpreadsheets({
      connectionId: connection.id,
      query: parsed.q,
      pageSize: parsed.limit,
    })

    return jsonOk({ data: items })
  })
}

