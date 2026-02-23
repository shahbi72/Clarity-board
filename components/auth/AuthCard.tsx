'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Chrome, Github, Loader2, Sparkles } from 'lucide-react'
import {
  createFallbackSessionCookie,
  hasFallbackSessionFromCookieHeader,
} from '@/lib/auth/fallback-session'
import { getSupabaseBrowserClient, isSupabaseBrowserAuthConfigured } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type AuthMode = 'sign-in' | 'sign-up'

type AuthCardProps = {
  mode: AuthMode
}

type OAuthProvider = 'google' | 'github'

export function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), [])
  const authConfigured = isSupabaseBrowserAuthConfigured()

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [oauthLoading, setOauthLoading] = React.useState<OAuthProvider | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [info, setInfo] = React.useState<string | null>(null)

  const queryNext = searchParams.get('next')
  const nextPath = queryNext && queryNext.startsWith('/') ? queryNext : '/dashboard'

  React.useEffect(() => {
    const queryError = searchParams.get('error')
    if (queryError) {
      setError(queryError)
    }
  }, [searchParams])

  React.useEffect(() => {
    if (!authConfigured || !supabase) {
      if (typeof document !== 'undefined' && hasFallbackSessionFromCookieHeader(document.cookie)) {
        router.replace(nextPath)
      }
      return
    }

    const syncSession = async () => {
      const { data, error: userError } = await supabase.auth.getUser()
      if (!userError && data.user) {
        router.replace(nextPath)
      }
    }

    void syncSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        router.replace(nextPath)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [authConfigured, supabase, router, nextPath])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setInfo(null)

    if (!authConfigured || !supabase) {
      if (typeof document !== 'undefined') {
        const secure = window.location.protocol === 'https:'
        document.cookie = createFallbackSessionCookie({ secure })
      }
      router.replace(nextPath)
      router.refresh()
      return
    }

    setIsSubmitting(true)
    try {
      if (mode === 'sign-in') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (signInError) throw signInError
        router.replace(nextPath)
        router.refresh()
        return
      }

      const redirectTo = `${window.location.origin}/auth/callback`
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: redirectTo },
      })
      if (signUpError) throw signUpError

      if (data.session?.user) {
        router.replace(nextPath)
        router.refresh()
        return
      }

      setInfo('Account created. Check your inbox to confirm your email, then continue to dashboard.')
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOAuth = async (provider: OAuthProvider) => {
    setError(null)
    setInfo(null)

    if (!authConfigured || !supabase) {
      setError('OAuth sign-in requires Supabase auth configuration.')
      return
    }

    setOauthLoading(provider)
    try {
      const redirectTo = `${window.location.origin}/auth/callback`
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      })
      if (oauthError) throw oauthError
    } catch (oauthError) {
      setError(oauthError instanceof Error ? oauthError.message : 'OAuth sign-in failed.')
      setOauthLoading(null)
    }
  }

  const isSignIn = mode === 'sign-in'
  const title = isSignIn ? 'Sign In to Clarityboard' : 'Create your Clarityboard account'
  const description = isSignIn
    ? 'Use your credentials or continue with Google or GitHub.'
    : 'Start with email/password or continue with Google or GitHub.'

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md border-border bg-card shadow-lg">
        <CardHeader className="space-y-4">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!authConfigured ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Supabase auth env vars are missing. Local fallback auth is active for this deployment.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {info ? (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
              {info}
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleOAuth('google')}
              disabled={oauthLoading !== null || isSubmitting}
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Chrome className="mr-2 h-4 w-4" />
              )}
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleOAuth('github')}
              disabled={oauthLoading !== null || isSubmitting}
            >
              {oauthLoading === 'github' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Github className="mr-2 h-4 w-4" />
              )}
              Continue with GitHub
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
            </div>
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor={`${mode}-email`}>Email</Label>
              <Input
                id={`${mode}-email`}
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${mode}-password`}>Password</Label>
              <Input
                id={`${mode}-password`}
                type="password"
                placeholder="Minimum 6 characters"
                autoComplete={isSignIn ? 'current-password' : 'new-password'}
                minLength={6}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || oauthLoading !== null}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSignIn ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isSignIn ? 'New to Clarityboard?' : 'Already have an account?'}{' '}
            <Link
              href={isSignIn ? `/signup${queryNext ? `?next=${encodeURIComponent(queryNext)}` : ''}` : `/login${queryNext ? `?next=${encodeURIComponent(queryNext)}` : ''}`}
              className="font-medium text-primary hover:underline"
            >
              {isSignIn ? 'Create account' : 'Sign in'}
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <Link href="/help" className="underline">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy-policy" className="underline">
              Privacy Policy
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
