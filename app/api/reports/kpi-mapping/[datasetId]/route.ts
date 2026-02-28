import { z } from 'zod'
import { requireReportsAuthContext } from '@/lib/reports/auth/context'
import { ApiError, parseJsonBody, parseQuery } from '@/lib/reports/server/api-error'
import { enforceRateLimit, rateLimitKey } from '@/lib/reports/server/rate-limit'
import { jsonOk, withApiHandler } from '@/lib/reports/server/route'
import { prisma } from '@/lib/server/prisma'

const paramsSchema = z.object({
  datasetId: z.string().min(1).max(50),
})

const patchSchema = z.object({
  dateColumn: z.string().nullable().optional(),
  revenueColumn: z.string().nullable().optional(),
  costColumn: z.string().nullable().optional(),
  ordersColumn: z.string().nullable().optional(),
  profitColumn: z.string().nullable().optional(),
  conversionRateColumn: z.string().nullable().optional(),
})

export async function GET(
  request: Request,
  context: { params: Promise<{ datasetId: string }> }
): Promise<Response> {
  return withApiHandler(async () => {
    const auth = await requireReportsAuthContext()
    enforceRateLimit(rateLimitKey(request, 'reports_kpi_mapping_get', auth.userId), 120, 60_000)

    const { datasetId } = parseQuery(paramsSchema, await context.params)

    const mapping = await prisma.kpiMapping.findFirst({
      where: {
        datasetId,
        workspaceId: auth.workspaceId,
        userId: auth.userId,
      },
    })

    if (!mapping) {
      throw new ApiError(404, 'kpi_mapping_not_found', 'KPI mapping not found for dataset.')
    }

    return jsonOk({ data: mapping })
  })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ datasetId: string }> }
): Promise<Response> {
  return withApiHandler(async () => {
    const auth = await requireReportsAuthContext()
    enforceRateLimit(rateLimitKey(request, 'reports_kpi_mapping_patch', auth.userId), 20, 60_000)

    const { datasetId } = parseQuery(paramsSchema, await context.params)
    const payload = await parseJsonBody(request, patchSchema)

    const updated = await prisma.kpiMapping.updateMany({
      where: {
        datasetId,
        workspaceId: auth.workspaceId,
        userId: auth.userId,
      },
      data: {
        ...payload,
        isOverridden: true,
      },
    })

    if (updated.count === 0) {
      throw new ApiError(404, 'kpi_mapping_not_found', 'KPI mapping not found for dataset.')
    }

    const mapping = await prisma.kpiMapping.findUnique({ where: { datasetId } })

    return jsonOk({ data: mapping })
  })
}

