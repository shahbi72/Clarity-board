import { requireReportsAuthContext } from '@/lib/reports/auth/context'
import { revokeGoogleConnection } from '@/lib/reports/google/client'
import { writeAuditLog } from '@/lib/reports/server/audit'
import { enforceRateLimit, rateLimitKey } from '@/lib/reports/server/rate-limit'
import { jsonOk, withApiHandler } from '@/lib/reports/server/route'
import { prisma } from '@/lib/server/prisma'

export async function DELETE(request: Request): Promise<Response> {
  return withApiHandler(async () => {
    const auth = await requireReportsAuthContext()
    enforceRateLimit(rateLimitKey(request, 'reports_delete', auth.userId), 3, 60 * 60 * 1000)

    const connections = await prisma.connection.findMany({
      where: {
        workspaceId: auth.workspaceId,
        userId: auth.userId,
      },
      select: { id: true },
    })

    for (const connection of connections) {
      await revokeGoogleConnection(connection.id)
    }

    await prisma.workspace.delete({
      where: { id: auth.workspaceId },
    })

    await writeAuditLog({
      workspaceId: null,
      userId: auth.userId,
      action: 'workspace.deleted',
      resourceType: 'workspace',
      resourceId: auth.workspaceId,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    })

    return jsonOk({ data: { deleted: true } })
  })
}

