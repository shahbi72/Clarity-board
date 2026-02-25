'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, MailCheck, RefreshCw } from 'lucide-react'
import { useI18n } from '@/components/language/language-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export default function VerifyEmailPage() {
  const { t } = useI18n()
  const tVerify = (key: string) => t(`verifyEmail.${key}`)
  const router = useRouter()
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), [])

  const [email, setEmail] = React.useState('')
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [isResending, setIsResending] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  React.useEffect(() => {
    if (!supabase) return

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      setEmail(data.user?.email ?? '')
    }

    void loadUser()
  }, [supabase])

  const handleResend = async () => {
    if (!supabase) {
      setError(tVerify('resendUnavailable'))
      return
    }
    if (!email) {
      setError(tVerify('missingEmail'))
      return
    }

    setError(null)
    setMessage(null)
    setIsResending(true)

    try {
      const redirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      })

      if (resendError) {
        throw resendError
      }

      setMessage(tVerify('resendSuccess'))
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : tVerify('resendError'))
    } finally {
      setIsResending(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setError(null)
    setMessage(null)
    router.refresh()
    router.replace('/app/dashboard')
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-2">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MailCheck className="h-5 w-5" />
          </div>
          <CardTitle>{tVerify('title')}</CardTitle>
          <CardDescription>
            {tVerify('description')}
            {email ? ` ${email}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
              {message}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => void handleResend()} disabled={isResending} className="sm:flex-1">
              {isResending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {tVerify('resend')}
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              className="sm:flex-1"
            >
              {isRefreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {tVerify('iVerified')}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:underline">
              {tVerify('backToSignIn')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
