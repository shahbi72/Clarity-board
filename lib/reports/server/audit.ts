import { prisma } from '@/lib/server/prisma'
import { logger } from '@/lib/reports/server/logger'
import type { Prisma } from '@prisma/client'

type AuditEventInput = {
  workspaceId?: string | null
  userId?: string | null
  action: string
  resourceType: string
  resourceId?: string | null
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
}

export async function writeAuditLog(event: AuditEventInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        workspaceId: event.workspaceId ?? null,
        userId: event.userId ?? null,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId ?? null,
        metadata: (event.metadata ?? {}) as Prisma.InputJsonValue,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ?? null,
      },
    })
  } catch (error) {
    logger.error('Failed to persist audit log', {
      action: event.action,
      resourceType: event.resourceType,
      error: error instanceof Error ? error.message : 'unknown_error',
    })
  }
}

