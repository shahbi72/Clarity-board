import { requireReportsAuthContext } from '@/lib/reports/auth/context'
import { getBillingGate } from '@/lib/reports/server/tenancy'
import { enforceRateLimit, rateLimitKey } from '@/lib/reports/server/rate-limit'
import { jsonOk, withApiHandler } from '@/lib/reports/server/route'
import { prisma } from '@/lib/server/prisma'

export async function GET(request: Request): Promise<Response> {
  return withApiHandler(async () => {
    const auth = await requireReportsAuthContext()
    enforceRateLimit(rateLimitKey(request, 'reports_billing_status', auth.userId), 120, 60_000)

    const [gate, subscription] = await Promise.all([
      getBillingGate(auth.userId),
      prisma.subscription.findFirst({
        where: { userId: auth.userId, provider: 'PADDLE' },
      }),
    ])

    return jsonOk({
      data: {
        gate,
        subscription,
      },
    })
  })
}

