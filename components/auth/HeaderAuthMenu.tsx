'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CreditCard, Languages, Loader2, LogOut, UserCircle2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import {
  clearFallbackSessionCookie,
  hasFallbackSessionFromCookieHeader,
  isFallbackAuthEnabled,
} from '@/lib/auth/fallback-session'
import { getSupabaseBrowserClient, isSupabaseBrowserAuthConfigured } from '@/lib/supabase/client'
import { useI18n, useLanguagePreference } from '@/components/language/language-provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { isLanguageCode, LANGUAGE_OPTIONS } from '@/lib/language'

function getDisplayName(user: User): string {
  const fullName = user.user_metadata?.full_name
  const preferredName = user.user_metadata?.name
  const email = user.email
  return (fullName || preferredName || email || 'User').toString()
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export function HeaderAuthMenu() {
  const router = useRouter()
  const { t } = useI18n()
  const tAuth = (key: string) => t(`auth.${key}`)
  const authConfigured = isSupabaseBrowserAuthConfigured()
  const fallbackEnabled = isFallbackAuthEnabled()
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), [])
  const { language, setLanguage } = useLanguagePreference()

  const [user, setUser] = React.useState<User | null>(null)
  const [hasFallbackSession, setHasFallbackSession] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(authConfigured)
  const [isSigningOut, setIsSigningOut] = React.useState(false)

  React.useEffect(() => {
    if (!authConfigured || !supabase) {
      setIsLoading(false)
      if (fallbackEnabled && typeof document !== 'undefined') {
        setHasFallbackSession(hasFallbackSessionFromCookieHeader(document.cookie))
      }
      return
    }

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user ?? null)
      setIsLoading(false)
    }

    void loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [authConfigured, fallbackEnabled, supabase])

  const handleSignOut = async () => {
    if ((!authConfigured || !supabase) && fallbackEnabled) {
      setIsSigningOut(true)
      if (typeof document !== 'undefined') {
        const secure = window.location.protocol === 'https:'
        document.cookie = clearFallbackSessionCookie({ secure })
      }
      setHasFallbackSession(false)
      router.push('/login')
      router.refresh()
      setIsSigningOut(false)
      return
    }

    setIsSigningOut(true)
    if (supabase) {
      await supabase.auth.signOut()
    }
    setUser(null)
    router.push('/login')
    router.refresh()
    setIsSigningOut(false)
  }

  const handleLanguageChange = (value: string) => {
    if (isLanguageCode(value)) {
      setLanguage(value)
    }
  }

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="sr-only">{tAuth('signIn')}</span>
      </Button>
    )
  }

  const isAuthenticated = authConfigured ? Boolean(user) : fallbackEnabled && hasFallbackSession

  if (!isAuthenticated) {
    return (
      <Button asChild size="sm">
        <Link href="/login">{tAuth('signIn')}</Link>
      </Button>
    )
  }

  const displayName = user ? getDisplayName(user) : 'Clarityboard User'
  const email = user?.email ?? ''
  const initials = getInitials(displayName)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src="/placeholder-user.jpg" alt={displayName} />
            <AvatarFallback className="bg-primary/15 text-primary">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push('/settings')}>
          <UserCircle2 className="mr-2 h-4 w-4" />
          {tAuth('profile')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push('/pricing')}>
          <CreditCard className="mr-2 h-4 w-4" />
          {tAuth('billing')}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Languages className="mr-2 h-4 w-4" />
            {tAuth('language')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            <DropdownMenuRadioGroup value={language} onValueChange={handleLanguageChange}>
              {LANGUAGE_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.code} value={option.code}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void handleSignOut()
          }}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          {tAuth('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
