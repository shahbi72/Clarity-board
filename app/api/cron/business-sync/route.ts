import { NextResponse } from 'next/server'
import { jsonApiError, ApiRouteError } from '@/lib/server/api-response'
import { runBusinessSyncForEligibleUsers } from '@/lib/server/business-sync/sync'

function assertCronSecret(request: Request) {
  const expected = process.env.CRON_SECRET?.trim() ?? ''
  const received = request.headers.get('x-cron-secret')?.trim() ?? ''

  if (!expected || received !== expected) {
    throw new ApiRouteError(401, 'unauthorized', 'Invalid cron secret.')
  }
}

export async function GET(request: Request) {
  return POST(request)
}

export async function POST(request: Request) {
  try {
    assertCronSecret(request)
    const result = await runBusinessSyncForEligibleUsers()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return jsonApiError(error)
  }
}
