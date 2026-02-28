import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { PostgrestError } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import {
  FALLBACK_AUTH_COOKIE_NAME,
  hasFallbackSessionValue,
  isFallbackAuthEnabled,
} from '@/lib/auth/fallback-session'
import { isProfileComplete, type ProfileRecordShape } from '@/lib/profile'
import { getSupabaseConfig, isSupabaseAuthConfigured } from '@/lib/supabase/config'

const VERIFY_EMAIL_PATH = '/app/verify-email'
const ONBOARDING_PATH = '/app/onboarding'
const DEFAULT_APP_PATH = '/app/dashboard'

function createLoginRedirect(request: NextRequest): NextResponse {
  const signInUrl = new URL('/login', request.url)
  signInUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(signInUrl)
}

function createAppRedirect(request: NextRequest, pathname: string): NextResponse {
  return NextResponse.redirect(new URL(pathname, request.url))
}

function isEmailPasswordUser(user: {
  app_metadata?: { provider?: string }
  identities?: Array<{ provider?: string }>
}): boolean {
  if (user.app_metadata?.provider === 'email') {
    return true
  }

  return user.identities?.some((identity) => identity.provider === 'email') ?? false
}

function isNoRowsError(error: PostgrestError | null): boolean {
  return Boolean(error && error.code === 'PGRST116')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/reports') || pathname.startsWith('/api/cron')) {
    return NextResponse.json(
      { error: 'Disabled for Shopify MVP: this endpoint has been deprecated.' },
      { status: 410 }
    )
  }

  if (pathname.startsWith('/reports')) {
    return createAppRedirect(request, '/')
  }

  if (!pathname.startsWith('/app')) {
    return NextResponse.next()
  }

  if (!isSupabaseAuthConfigured()) {
    if (
      isFallbackAuthEnabled() &&
      hasFallbackSessionValue(request.cookies.get(FALLBACK_AUTH_COOKIE_NAME)?.value)
    ) {
      return NextResponse.next()
    }
    return createLoginRedirect(request)
  }

  let response = NextResponse.next({
    request,
  })

  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        response = NextResponse.next({
          request,
        })

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return createLoginRedirect(request)
  }

  const needsEmailVerification = isEmailPasswordUser(user) && !user.email_confirmed_at
  const isVerifyEmailRoute = pathname === VERIFY_EMAIL_PATH
  const isOnboardingRoute = pathname === ONBOARDING_PATH

  if (needsEmailVerification) {
    if (!isVerifyEmailRoute) {
      return createAppRedirect(request, VERIFY_EMAIL_PATH)
    }

    return response
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, last_name, company_name, company_size, language')
    .eq('user_id', user.id)
    .maybeSingle<ProfileRecordShape>()

  const hasProfileReadError = Boolean(profileError && !isNoRowsError(profileError))
  const isComplete = !hasProfileReadError && isProfileComplete(profile)

  if (!isComplete && !isOnboardingRoute) {
    return createAppRedirect(request, ONBOARDING_PATH)
  }

  if (isComplete && (isOnboardingRoute || isVerifyEmailRoute)) {
    return createAppRedirect(request, DEFAULT_APP_PATH)
  }

  if (!isComplete && isVerifyEmailRoute) {
    return createAppRedirect(request, ONBOARDING_PATH)
  }

  return response
}

export const config = {
  matcher: ['/app/:path*', '/reports/:path*', '/api/reports/:path*', '/api/cron/:path*'],
}
