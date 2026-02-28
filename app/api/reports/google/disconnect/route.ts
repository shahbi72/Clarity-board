import { requireReportsAuthContext } from '@/lib/reports/auth/context'
import { getGoogleConnection, revokeGoogleConnection } from '@/lib/reports/google/client'
import { writeAuditLog } from '@/lib/reports/server/audit'
import { enforceRateLimit, rateLimitKey } from '@/lib/reports/server/rate-limit'
import { jsonOk, withApiHandler } from '@/lib/reports/server/route'
import { prisma } from '@/lib/server/prisma'

export async function POST(request: Request): Promise<Response> {
  return withApiHandler(async () => {
    const auth = await requireReportsAuthContext()
    enforceRateLimit(rateLimitKey(request, 'reports_google_disconnect', auth.userId), 10, 60_000)

    const connection = await getGoogleConnection(auth.workspaceId, auth.userId)
    await revokeGoogleConnection(connection.id)

    await prisma.sheetSource.updateMany({
      where: {
        workspaceId: auth.workspaceId,
        userId: auth.userId,
        connectionId: connection.id,
      },
      data: {
        isActive: false,
      },
    })

    await prisma.reportSchedule.updateMany({
      where: {
        workspaceId: auth.workspaceId,
        userId: auth.userId,
      },
      data: {
        enabled: false,
      },
    })

    await writeAuditLog({
      workspaceId: auth.workspaceId,
      userId: auth.userId,
      action: 'google.disconnected',
      resourceType: 'connection',
      resourceId: connection.id,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    })

    return jsonOk({ data: { disconnected: true } })
  })
}

