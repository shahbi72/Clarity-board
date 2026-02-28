import { z } from 'zod'
import { requireReportsAuthContext } from '@/lib/reports/auth/context'
import { getBillingGate } from '@/lib/reports/server/tenancy'
import { getDatasetDashboardSummary } from '@/lib/reports/server/dashboard'
import { parseQuery } from '@/lib/reports/server/api-error'
import { enforceRateLimit, rateLimitKey } from '@/lib/reports/server/rate-limit'
import { jsonOk, withApiHandler } from '@/lib/reports/server/route'

const querySchema = z.object({
  datasetId: z.string().max(50).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
})

export async function GET(request: Request): Promise<Response> {
  return withApiHandler(async () => {
    const auth = await requireReportsAuthContext()
    enforceRateLimit(rateLimitKey(request, 'reports_dashboard_summary', auth.userId), 80, 60_000)
    const gate = await getBillingGate(auth.userId)

    const url = new URL(request.url)
    const query = parseQuery(querySchema, {
      datasetId: url.searchParams.get('datasetId') ?? undefined,
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
    })

    if (!gate.allowed) {
      return jsonOk({
        data: {
          paywalled: true,
          gate,
        },
      })
    }

    const summary = await getDatasetDashboardSummary({
      workspaceId: auth.workspaceId,
      userId: auth.userId,
      datasetId: query.datasetId,
      range: {
        from: query.from,
        to: query.to,
      },
    })

    return jsonOk({ data: { paywalled: false, gate, ...summary } })
  })
}

