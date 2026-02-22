'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CreditCard, Loader2, LogOut, UserCircle2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { getSupabaseBrowserClient, isSupabaseBrowserAuthConfigured } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
  const authConfigured = isSupabaseBrowserAuthConfigured()
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), [])

  const [user, setUser] = React.useState<User | null>(null)
  const [isLoading, setIsLoading] = React.useState(authConfigured)
  const [isSigningOut, setIsSigningOut] = React.useState(false)

  React.useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
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
  }, [supabase])

  const handleSignOut = async () => {
    if (!supabase) {
      router.push('/auth/sign-in')
      return
    }

    setIsSigningOut(true)
    await supabase.auth.signOut()
    setUser(null)
    router.push('/auth/sign-in')
    router.refresh()
    setIsSigningOut(false)
  }

  if (!authConfigured) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard">Demo Mode</Link>
      </Button>
    )
  }

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="sr-only">Loading session</span>
      </Button>
    )
  }

  if (!user) {
    return (
      <Button asChild size="sm">
        <Link href="/auth/sign-in">Sign In</Link>
      </Button>
    )
  }

  const displayName = getDisplayName(user)
  const email = user.email ?? ''
  const initials = getInitials(displayName)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
          <Avatar className="h-9 w-9 border border-slate-200">
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
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push('/pricing')}>
          <CreditCard className="mr-2 h-4 w-4" />
          Billing
        </DropdownMenuItem>
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
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
