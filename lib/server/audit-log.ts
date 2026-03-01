import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/server/prisma'
import { logger } from '@/lib/reports/server/logger'

export async function writeAuditLog(params: {
  userId: string
  action: string
  resourceType: string
  resourceId?: string | null
  metadata?: Record<string, unknown>
  request?: Request
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId ?? null,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
        ipAddress:
          params.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        userAgent: params.request?.headers.get('user-agent') ?? null,
      },
    })
  } catch (error) {
    logger.warn('Failed to write audit log', {
      action: params.action,
      resourceType: params.resourceType,
      message: error instanceof Error ? error.message : 'unknown_error',
    })
  }
}
