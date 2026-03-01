import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { ensureCurrentUser, getCurrentUserId } from '@/lib/server/auth'
import { jsonApiError } from '@/lib/server/api-response'
import { buildGoogleOAuthUrl } from '@/lib/server/business-sync/google'
import { getBusinessFeatureGate } from '@/lib/server/business-sync/subscription'

const OAUTH_STATE_COOKIE = 'business_google_oauth_state'

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
            message: gate.message ?? 'Upgrade to Business to unlock live sync and notifications.',
          },
        },
        { status: 402 }
      )
    }

    const state = `${userId}:${randomUUID()}`
    const redirectUrl = buildGoogleOAuthUrl(state)
    const response = NextResponse.redirect(redirectUrl)

    response.cookies.set({
      name: OAUTH_STATE_COOKIE,
      value: state,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 10,
    })

    return response
  } catch (error) {
    return jsonApiError(error)
  }
}
