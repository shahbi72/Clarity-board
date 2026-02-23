import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { FALLBACK_AUTH_COOKIE_NAME, hasFallbackSessionValue } from '@/lib/auth/fallback-session'
import { getSupabaseConfig, isSupabaseAuthConfigured } from '@/lib/supabase/config'

function createLoginRedirect(request: NextRequest): NextResponse {
  const signInUrl = new URL('/login', request.url)
  signInUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(signInUrl)
}

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/app')) {
    return NextResponse.next()
  }

  if (!isSupabaseAuthConfigured()) {
    if (hasFallbackSessionValue(request.cookies.get(FALLBACK_AUTH_COOKIE_NAME)?.value)) {
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

  return response
}

export const config = {
  matcher: ['/app/:path*'],
}
