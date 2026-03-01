import { NextResponse } from 'next/server'
import { ensureCurrentUser, getCurrentUserId } from '@/lib/server/auth'
import { jsonApiError } from '@/lib/server/api-response'
import { getBusinessStatusForUser } from '@/lib/server/business-sync/status'
import { ensureShopifyTrialForUser } from '@/lib/server/subscriptions'

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    await ensureCurrentUser(userId)
    await ensureShopifyTrialForUser(userId)
    const status = await getBusinessStatusForUser(userId)
    return NextResponse.json(status)
  } catch (error) {
    return jsonApiError(error)
  }
}
