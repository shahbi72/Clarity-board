import { NextRequest, NextResponse } from 'next/server'
import { ensureProfileInitializedForCurrentUser } from '@/lib/server/profile'
import { getSupabaseServerClient, isSupabaseAuthConfigured } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const dashboardUrl = new URL('/app/dashboard', request.url)
  if (!isSupabaseAuthConfigured()) {
    return NextResponse.redirect(dashboardUrl)
  }

  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    const signInUrl = new URL('/login', request.url)
    signInUrl.searchParams.set('error', 'Missing OAuth authorization code.')
    return NextResponse.redirect(signInUrl)
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.redirect(dashboardUrl)
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    const signInUrl = new URL('/login', request.url)
    signInUrl.searchParams.set('error', error.message)
    return NextResponse.redirect(signInUrl)
  }

  try {
    await ensureProfileInitializedForCurrentUser()
  } catch {
    // Do not block successful auth if profile initialization temporarily fails.
  }

  return NextResponse.redirect(dashboardUrl)
}
