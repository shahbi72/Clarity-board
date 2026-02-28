import { z } from 'zod'
import { requireReportsAuthContext } from '@/lib/reports/auth/context'
import { parseJsonBody } from '@/lib/reports/server/api-error'
import { enforceRateLimit, rateLimitKey } from '@/lib/reports/server/rate-limit'
import { jsonOk, withApiHandler } from '@/lib/reports/server/route'
import { computeNextWeeklyRun } from '@/lib/reports/scheduling'
import { prisma } from '@/lib/server/prisma'

const scheduleSchema = z.object({
  enabled: z.boolean().default(true),
  dayOfWeek: z.number().int().min(0).max(6).default(1),
  timeOfDay: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .default('09:00'),
  timezone: z.string().min(1).default('Europe/Istanbul'),
  recipientEmail: z.string().email().nullable().optional(),
  sheetSourceId: z.string().nullable().optional(),
})

export async function GET(request: Request): Promise<Response> {
  return withApiHandler(async () => {
    const auth = await requireReportsAuthContext()
    enforceRateLimit(rateLimitKey(request, 'reports_schedule_get', auth.userId), 120, 60_000)

    const schedule = await prisma.reportSchedule.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: auth.workspaceId,
          userId: auth.userId,
        },
      },
    })

    return jsonOk({ data: schedule })
  })
}

export async function PUT(request: Request): Promise<Response> {
  return withApiHandler(async () => {
    const auth = await requireReportsAuthContext()
    enforceRateLimit(rateLimitKey(request, 'reports_schedule_put', auth.userId), 20, 60_000)

    const payload = await parseJsonBody(request, scheduleSchema)

    const nextRunAt = payload.enabled
      ? computeNextWeeklyRun({
          dayOfWeek: payload.dayOfWeek ?? 1,
          timeOfDay: payload.timeOfDay ?? '09:00',
          timezone: payload.timezone ?? 'Europe/Istanbul',
        })
      : null

    const schedule = await prisma.reportSchedule.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: auth.workspaceId,
          userId: auth.userId,
        },
      },
      update: {
        enabled: payload.enabled,
        dayOfWeek: payload.dayOfWeek,
        timeOfDay: payload.timeOfDay,
        timezone: payload.timezone,
        recipientEmail: payload.recipientEmail,
        sheetSourceId: payload.sheetSourceId,
        nextRunAt,
      },
      create: {
        workspaceId: auth.workspaceId,
        userId: auth.userId,
        enabled: payload.enabled,
        dayOfWeek: payload.dayOfWeek,
        timeOfDay: payload.timeOfDay,
        timezone: payload.timezone,
        recipientEmail: payload.recipientEmail,
        sheetSourceId: payload.sheetSourceId,
        nextRunAt,
      },
    })

    return jsonOk({ data: schedule })
  })
}

