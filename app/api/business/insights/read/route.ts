import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ensureCurrentUser, getCurrentUserId } from '@/lib/server/auth'
import { jsonApiError } from '@/lib/server/api-response'
import { writeAuditLog } from '@/lib/server/audit-log'
import { getBusinessFeatureGate } from '@/lib/server/business-sync/subscription'
import { prisma } from '@/lib/server/prisma'

const BodySchema = z
  .object({
    ids: z.array(z.string().trim().min(1)).max(100).optional(),
    all: z.boolean().optional().default(false),
  })
  .refine((value) => value.all || (value.ids && value.ids.length > 0), {
    message: 'Provide ids or set all=true.',
  })

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

    const payload = BodySchema.parse(await request.json())

    const where = payload.all
      ? {
          userId,
          readAt: null,
        }
      : {
          userId,
          id: {
            in: payload.ids ?? [],
          },
        }

    const result = await prisma.insightEvent.updateMany({
      where,
      data: {
        readAt: new Date(),
      },
    })

    await writeAuditLog({
      userId,
      action: 'business.insights.mark_read',
      resourceType: 'insight_event',
      metadata: {
        all: payload.all,
        count: result.count,
      },
      request,
    })

    const unreadCount = await prisma.insightEvent.count({
      where: {
        userId,
        readAt: null,
      },
    })

    return NextResponse.json({ ok: true, updated: result.count, unreadCount })
  } catch (error) {
    return jsonApiError(error)
  }
}
