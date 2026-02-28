import { requireReportsAuthContext } from '@/lib/reports/auth/context'
import { enforceRateLimit, rateLimitKey } from '@/lib/reports/server/rate-limit'
import { jsonOk, withApiHandler } from '@/lib/reports/server/route'
import { prisma } from '@/lib/server/prisma'

export async function GET(request: Request): Promise<Response> {
  return withApiHandler(async () => {
    const auth = await requireReportsAuthContext()
    enforceRateLimit(rateLimitKey(request, 'reports_export', auth.userId), 6, 60_000)

    const [workspace, sources, datasets, cleanTables, mappings, reports, schedules, subscriptions] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: auth.workspaceId } }),
      prisma.sheetSource.findMany({ where: { workspaceId: auth.workspaceId, userId: auth.userId } }),
      prisma.dataset.findMany({ where: { workspaceId: auth.workspaceId, userId: auth.userId } }),
      prisma.cleanTable.findMany({ where: { workspaceId: auth.workspaceId, userId: auth.userId } }),
      prisma.kpiMapping.findMany({ where: { workspaceId: auth.workspaceId, userId: auth.userId } }),
      prisma.report.findMany({ where: { workspaceId: auth.workspaceId, userId: auth.userId } }),
      prisma.reportSchedule.findMany({ where: { workspaceId: auth.workspaceId, userId: auth.userId } }),
      prisma.subscription.findMany({ where: { workspaceId: auth.workspaceId } }),
    ])

    return jsonOk({
      data: {
        exportedAt: new Date().toISOString(),
        workspace,
        sheetSources: sources,
        datasets,
        cleanTables,
        kpiMappings: mappings,
        reports,
        schedules,
        subscriptions,
      },
    })
  })
}

