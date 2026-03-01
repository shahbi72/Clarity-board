import { prisma } from '@/lib/server/prisma'
import type { BusinessStatusResponse } from '@/lib/types/shopify'
import { getBusinessFeatureGate } from '@/lib/server/business-sync/subscription'

export async function getBusinessStatusForUser(userId: string): Promise<BusinessStatusResponse> {
  const [gate, connection] = await Promise.all([
    getBusinessFeatureGate(userId),
    prisma.sheetConnection.findUnique({
      where: { userId },
      select: {
        spreadsheetName: true,
        sheetName: true,
        lastSyncedAt: true,
      },
    }),
  ])

  const unreadCount = gate.allowed
    ? await prisma.insightEvent.count({
        where: {
          userId,
          readAt: null,
        },
      })
    : 0

  return {
    eligible: gate.allowed,
    reason: gate.reason,
    message: gate.message,
    source: {
      connected: Boolean(connection?.spreadsheetName && connection?.sheetName),
      provider: 'GOOGLE_SHEETS',
      spreadsheetName: connection?.spreadsheetName ?? null,
      sheetName: connection?.sheetName ?? null,
      lastSyncedAt: connection?.lastSyncedAt ? connection.lastSyncedAt.toISOString() : null,
    },
    unreadCount,
  }
}
