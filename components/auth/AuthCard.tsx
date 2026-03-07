'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Chrome, Circle, Github, Loader2 } from 'lucide-react'
import { ClarityboardLogo } from '@/components/branding/ClarityboardLogo'
import {
  createFallbackSessionCookie,
  hasFallbackSessionFromCookieHeader,
  isFallbackAuthEnabled,
} from '@/lib/auth/fallback-session'
import { useI18n } from '@/components/language/language-provider'
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

const PASSWORD_MIN_LENGTH = 8

type PasswordRequirement = {
  key: string
  passed: boolean
}

function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      key: 'minLength',
      passed: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      key: 'lowercase',
      passed: /[a-z]/.test(password),
    },
    {
      key: 'uppercase',
      passed: /[A-Z]/.test(password),
    },
    {
      key: 'numberOrSymbol',
      passed: /[0-9\W_]/.test(password),
    },
  ]
}

export function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const tAuth = (key: string) => t(`auth.${key}`)
  const tAuthCard = (key: string) => t(`authCard.${key}`)
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), [])
  const authConfigured = isSupabaseBrowserAuthConfigured()
  const fallbackEnabled = isFallbackAuthEnabled()
  const authUnavailable = !authConfigured && !fallbackEnabled

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [oauthLoading, setOauthLoading] = React.useState<OAuthProvider | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [info, setInfo] = React.useState<string | null>(null)
  const [isCheckingSession, setIsCheckingSession] = React.useState(authConfigured)

  const queryNext = searchParams.get('next')
  const nextPath = queryNext && queryNext.startsWith('/') ? queryNext : '/app/dashboard'
  const isSignIn = mode === 'sign-in'

  const passwordRequirements = React.useMemo(
    () => getPasswordRequirements(password),
    [password]
  )
  const isPasswordStrong = React.useMemo(
    () => passwordRequirements.every((requirement) => requirement.passed),
    [passwordRequirements]
  )
  const canSubmit =
    !isSubmitting &&
    !isCheckingSession &&
    oauthLoading === null &&
    !authUnavailable &&
    (isSignIn || isPasswordStrong)

  React.useEffect(() => {
    const queryError = searchParams.get('error')
    if (queryError) {
      setError(queryError)
    }
  }, [searchParams])

  React.useEffect(() => {
    if (!authConfigured || !supabase) {
      if (
        fallbackEnabled &&
        typeof document !== 'undefined' &&
        hasFallbackSessionFromCookieHeader(document.cookie)
      ) {
        router.replace(nextPath)
        return
      }
      setIsCheckingSession(false)
      return
    }

    let mounted = true

    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) {
        return
      }

      if (session?.user) {
        router.replace(nextPath)
        router.refresh()
        return
      }

      setIsCheckingSession(false)
    }

    void syncSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        router.replace(nextPath)
        router.refresh()
        return
      }

      setIsCheckingSession(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [authConfigured, fallbackEnabled, supabase, router, nextPath])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setInfo(null)

    if (authUnavailable) {
      setError(tAuthCard('authUnavailable'))
      return
    }

    if (!isSignIn && !isPasswordStrong) {
      setError(tAuthCard('passwordWeak'))
      return
    }

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

        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session?.user) {
          router.replace(nextPath)
          router.refresh()
        }
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
        try {
          await fetch('/api/profile/initialize', {
            method: 'POST',
            cache: 'no-store',
          })
        } catch {
          // Profile initialization will be retried via auth callback or onboarding flows.
        }

        router.replace(nextPath)
        router.refresh()
        return
      }

      setInfo(tAuthCard('verifyEmailNotice'))
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOAuth = async (provider: OAuthProvider) => {
    setError(null)
    setInfo(null)

    if (!authConfigured || !supabase || authUnavailable) {
      setError(tAuthCard('oauthUnavailable'))
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

  const title = isSignIn ? tAuthCard('signInTitle') : tAuthCard('signUpTitle')
  const description = isSignIn
    ? tAuthCard('signInDescription')
    : tAuthCard('signUpDescription')

  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <Card className="w-full max-w-md border-border bg-card shadow-lg">
          <CardContent className="flex min-h-44 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Checking your session...
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md border-border bg-card shadow-lg">
        <CardHeader className="space-y-4">
          <ClarityboardLogo href="/" withBackground imageClassName="h-8 w-auto" />
          <div className="space-y-1">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!authConfigured ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {authUnavailable ? tAuthCard('authUnavailable') : tAuthCard('fallbackModeEnabled')}
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
              disabled={oauthLoading !== null || isSubmitting || authUnavailable}
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Chrome className="mr-2 h-4 w-4" />
              )}
              {tAuthCard('continueWithGoogle')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleOAuth('github')}
              disabled={oauthLoading !== null || isSubmitting || authUnavailable}
            >
              {oauthLoading === 'github' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Github className="mr-2 h-4 w-4" />
              )}
              {tAuthCard('continueWithGithub')}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{tAuthCard('orWithEmail')}</span>
            </div>
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor={`${mode}-email`}>{tAuthCard('emailLabel')}</Label>
              <Input
                id={`${mode}-email`}
                type="email"
                placeholder="clarityboard.app@gmail.com"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${mode}-password`}>{tAuthCard('passwordLabel')}</Label>
              <Input
                id={`${mode}-password`}
                type="password"
                placeholder={
                  isSignIn
                    ? tAuthCard('passwordPlaceholderSignIn')
                    : tAuthCard('passwordPlaceholderSignUp')
                }
                autoComplete={isSignIn ? 'current-password' : 'new-password'}
                minLength={isSignIn ? 1 : PASSWORD_MIN_LENGTH}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {!isSignIn ? (
              <ul className="space-y-1 rounded-md border border-border/70 bg-muted/25 p-3 text-xs text-muted-foreground">
                {passwordRequirements.map((requirement) => (
                  <li key={requirement.key} className="flex items-center gap-2">
                    {requirement.passed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Circle className="h-3.5 w-3.5" />
                    )}
                    <span
                      className={requirement.passed ? 'font-medium text-foreground' : undefined}
                    >
                      {tAuthCard(`passwordRequirement.${requirement.key}`)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSignIn ? tAuth('signIn') : tAuth('signUp')}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isSignIn ? tAuthCard('newUser') : tAuthCard('existingUser')}{' '}
            <Link
              href={isSignIn ? `/signup${queryNext ? `?next=${encodeURIComponent(queryNext)}` : ''}` : `/login${queryNext ? `?next=${encodeURIComponent(queryNext)}` : ''}`}
              className="font-medium text-primary hover:underline"
            >
              {isSignIn ? tAuthCard('createAccount') : tAuth('signIn')}
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground">
            {tAuthCard('termsPrefix')}{' '}
            <Link href="/help" className="underline">
              {tAuthCard('terms')}
            </Link>{' '}
            {tAuthCard('and')}{' '}
            <Link href="/privacy-policy" className="underline">
              {tAuthCard('privacyPolicy')}
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
