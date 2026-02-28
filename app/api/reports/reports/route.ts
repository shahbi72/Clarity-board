import { requireReportsAuthContext } from '@/lib/reports/auth/context'
import { enforceRateLimit, rateLimitKey } from '@/lib/reports/server/rate-limit'
import { jsonOk, withApiHandler } from '@/lib/reports/server/route'
import { prisma } from '@/lib/server/prisma'

export async function GET(request: Request): Promise<Response> {
  return withApiHandler(async () => {
    const auth = await requireReportsAuthContext()
    enforceRateLimit(rateLimitKey(request, 'reports_history', auth.userId), 80, 60_000)

    const reports = await prisma.report.findMany({
      where: {
        workspaceId: auth.workspaceId,
        userId: auth.userId,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return jsonOk({ data: reports })
  })
}

