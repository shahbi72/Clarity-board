import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient, isSupabaseAuthConfigured } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const dashboardUrl = new URL('/dashboard', request.url)
  if (!isSupabaseAuthConfigured()) {
    return NextResponse.redirect(dashboardUrl)
  }

  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    const signInUrl = new URL('/auth/sign-in', request.url)
    signInUrl.searchParams.set('error', 'Missing OAuth authorization code.')
    return NextResponse.redirect(signInUrl)
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.redirect(dashboardUrl)
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    const signInUrl = new URL('/auth/sign-in', request.url)
    signInUrl.searchParams.set('error', error.message)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.redirect(dashboardUrl)
}
