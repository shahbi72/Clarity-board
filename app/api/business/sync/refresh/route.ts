import { NextResponse } from 'next/server'
import { ensureCurrentUser, getCurrentUserId } from '@/lib/server/auth'
import { jsonApiError } from '@/lib/server/api-response'
import { writeAuditLog } from '@/lib/server/audit-log'
import { getBusinessFeatureGate } from '@/lib/server/business-sync/subscription'
import { runBusinessSyncForUser } from '@/lib/server/business-sync/sync'
import { buildRateLimitKey, enforceRateLimit } from '@/lib/server/rate-limit'

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    await ensureCurrentUser(userId)
    const gate = await getBusinessFeatureGate(userId)

    if (!gate.allowed) {
      return NextResponse.json(
        {
          error: {
            code: gate.reason,
            message: gate.message ?? 'Business plan required.',
          },
        },
        { status: 402 }
      )
    }

    const rateLimitKey = buildRateLimitKey('business_manual_refresh', request, userId)
    enforceRateLimit(rateLimitKey, 6, 60_000)

    const result = await runBusinessSyncForUser({
      userId,
      trigger: 'MANUAL',
    })

    await writeAuditLog({
      userId,
      action: 'business.sync.manual_refresh',
      resourceType: 'data_snapshot',
      resourceId: result.snapshotId,
      metadata: {
        changed: result.changed,
        rowCount: result.rowCount,
        insightCount: result.insightCount,
      },
      request,
    })

    return NextResponse.json({
      ok: true,
      changed: result.changed,
      snapshotId: result.snapshotId,
      rowCount: result.rowCount,
      insightCount: result.insightCount,
      syncedAt: result.syncedAt.toISOString(),
    })
  } catch (error) {
    return jsonApiError(error)
  }
}
