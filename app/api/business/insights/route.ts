import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ensureCurrentUser, getCurrentUserId } from '@/lib/server/auth'
import { jsonApiError } from '@/lib/server/api-response'
import { getBusinessFeatureGate } from '@/lib/server/business-sync/subscription'
import { prisma } from '@/lib/server/prisma'

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  unreadOnly: z
    .string()
    .optional()
    .transform((value) => value === '1' || value === 'true'),
})

export async function GET(request: Request) {
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

    const parsed = QuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams))

    const where = {
      userId,
      ...(parsed.unreadOnly ? { readAt: null } : {}),
    }

    const [unreadCount, items] = await Promise.all([
      prisma.insightEvent.count({
        where: {
          userId,
          readAt: null,
        },
      }),
      prisma.insightEvent.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: parsed.limit,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          severity: true,
          createdAt: true,
          readAt: true,
        },
      }),
    ])

    return NextResponse.json({
      unreadCount,
      items: items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        readAt: item.readAt ? item.readAt.toISOString() : null,
      })),
    })
  } catch (error) {
    return jsonApiError(error)
  }
}
