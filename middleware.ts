import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseConfig, isSupabaseAuthConfigured } from '@/lib/supabase/config'

const PUBLIC_PATHS = new Set(['/', '/login', '/signup', '/pricing'])
const PUBLIC_PATH_PREFIXES = ['/auth/callback', '/auth/sign-in', '/auth/sign-up']
const AUTH_PAGE_PATHS = new Set(['/login', '/signup', '/auth/sign-in', '/auth/sign-up'])

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function resolveSafeNextPath(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith('/')) {
    return '/dashboard'
  }

  if (AUTH_PAGE_PATHS.has(nextPath)) {
    return '/dashboard'
  }

  return nextPath
}

export async function middleware(request: NextRequest) {
  if (!isSupabaseAuthConfigured()) {
    return NextResponse.next()
  }

  const pathname = request.nextUrl.pathname
  const isPublic = isPublicPath(pathname)

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

  if (!user && !isPublic) {
    const signInUrl = new URL('/login', request.url)
    signInUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(signInUrl)
  }

  if (user && AUTH_PAGE_PATHS.has(pathname)) {
    const requestedNext = request.nextUrl.searchParams.get('next')
    const redirectPath = resolveSafeNextPath(requestedNext)
    return NextResponse.redirect(new URL(redirectPath, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|_next/data|favicon.ico|icon.svg|icon-light-32x32.png|icon-dark-32x32.png|apple-icon.png|.*\\..*).*)',
  ],
}
