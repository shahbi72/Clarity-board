import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ensureCurrentUser, getCurrentUserId } from '@/lib/server/auth'
import { writeAuditLog } from '@/lib/server/audit-log'
import { upsertGoogleConnectionFromCode } from '@/lib/server/business-sync/google'
import { getBusinessFeatureGate } from '@/lib/server/business-sync/subscription'
import { logger } from '@/lib/reports/server/logger'

const OAUTH_STATE_COOKIE = 'business_google_oauth_state'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const dashboardUrl = new URL('/dashboard', request.url)

  const code = url.searchParams.get('code')?.trim() ?? ''
  const state = url.searchParams.get('state')?.trim() ?? ''

  if (!code || !state) {
    dashboardUrl.searchParams.set('sync_error', 'missing_oauth_params')
    return NextResponse.redirect(dashboardUrl)
  }

  let userId: string

  try {
    userId = await getCurrentUserId()
    await ensureCurrentUser(userId)
  } catch {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', '/dashboard')
    return NextResponse.redirect(loginUrl)
  }

  const cookieStore = await cookies()
  const cookieState = cookieStore.get(OAUTH_STATE_COOKIE)?.value

  const gate = await getBusinessFeatureGate(userId)
  if (!gate.allowed) {
    dashboardUrl.searchParams.set('sync_error', gate.reason)
    return NextResponse.redirect(dashboardUrl)
  }

  if (!cookieState || cookieState !== state || !state.startsWith(`${userId}:`)) {
    dashboardUrl.searchParams.set('sync_error', 'invalid_oauth_state')
    const invalidStateResponse = NextResponse.redirect(dashboardUrl)
    invalidStateResponse.cookies.set(OAUTH_STATE_COOKIE, '', { path: '/', maxAge: 0 })
    return invalidStateResponse
  }

  try {
    await upsertGoogleConnectionFromCode({ userId, code })
    await writeAuditLog({
      userId,
      action: 'business.google.connect',
      resourceType: 'sheet_connection',
      metadata: {
        provider: 'GOOGLE_SHEETS',
      },
      request,
    })

    dashboardUrl.searchParams.set('connected', '1')
  } catch (error) {
    logger.warn('Failed to complete Google callback', {
      userId,
      message: error instanceof Error ? error.message : 'unknown_error',
    })
    dashboardUrl.searchParams.set('sync_error', 'oauth_exchange_failed')
  }

  const response = NextResponse.redirect(dashboardUrl)
  response.cookies.set(OAUTH_STATE_COOKIE, '', { path: '/', maxAge: 0 })
  return response
}
