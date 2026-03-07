'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  Lightbulb,
  Lock,
  LogOut,
  Menu,
  Package,
  RefreshCcw,
  Settings,
  TrendingUp,
  Upload,
  WalletCards,
} from 'lucide-react'
import { ClarityboardLogo } from '@/components/branding/ClarityboardLogo'
import { useDashboardData } from '@/components/dashboard/dashboard-data-provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useBillingActions } from '@/hooks/use-billing-actions'
import { useUserPlan } from '@/hooks/use-user-plan'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type AppShellProps = {
  children: React.ReactNode
}

type SidebarNavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  businessOnly?: boolean
}

const DEMO_ROUTE_MAP: Record<string, string> = {
  '/dashboard': '/demo',
  '/dashboard/insights': '/demo/insights',
  '/dashboard/products': '/demo/products',
  '/dashboard/profit': '/demo/profit',
  '/dashboard/trends': '/demo/trends',
  '/dashboard/sync': '/demo/sync',
  '/dashboard/settings': '/demo/settings',
}

const NAV_ITEMS: SidebarNavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Upload Dataset', href: '/upload', icon: Upload },
  { label: 'Insights', href: '/dashboard/insights', icon: Lightbulb },
  { label: 'Products', href: '/dashboard/products', icon: Package },
  { label: 'Profit Estimator', href: '/dashboard/profit', icon: WalletCards },
  { label: 'Revenue Trends', href: '/dashboard/trends', icon: TrendingUp },
  { label: 'Sync', href: '/dashboard/sync', icon: RefreshCcw, businessOnly: true },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/demo': 'Overview',
  '/upload': 'Upload Dataset',
  '/dashboard/insights': 'Insights',
  '/demo/insights': 'Insights',
  '/dashboard/products': 'Products',
  '/demo/products': 'Products',
  '/dashboard/profit': 'Profit Estimator',
  '/demo/profit': 'Profit Estimator',
  '/dashboard/trends': 'Revenue Trends',
  '/demo/trends': 'Revenue Trends',
  '/dashboard/sync': 'Sync',
  '/demo/sync': 'Sync',
  '/dashboard/settings': 'Settings',
  '/demo/settings': 'Settings',
}

function getPageTitle(pathname: string): string {
  if (pathname in PAGE_TITLES) {
    return PAGE_TITLES[pathname]
  }
  return 'Dashboard'
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

function getInitials(nameOrEmail: string): string {
  const tokens = nameOrEmail.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) {
    return 'CB'
  }
  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase()
  }
  return `${tokens[0][0] ?? ''}${tokens[1][0] ?? ''}`.toUpperCase()
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { unreadCount, user, isDemoMode } = useDashboardData()
  const userPlan = useUserPlan()
  const { openCheckout, openPortal, checkoutLoading, portalLoading } = useBillingActions()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname])
  const navItems = useMemo(
    () =>
      NAV_ITEMS
        .filter((item) => !(isDemoMode && item.href === '/upload'))
        .map((item) => ({
          ...item,
          href: isDemoMode ? (DEMO_ROUTE_MAP[item.href] ?? item.href) : item.href,
        })),
    [isDemoMode]
  )

  const sidebarWidthClass = collapsed ? 'md:w-16' : 'md:w-[240px]'
  const contentOffsetClass = collapsed ? 'md:left-16' : 'md:left-[240px]'
  const homeHref = isDemoMode ? '/demo' : '/dashboard'
  const insightsHref = isDemoMode ? '/demo/insights' : '/dashboard/insights'
  const settingsHref = isDemoMode ? '/demo/settings' : '/dashboard/settings'

  const userLabel = user.name || user.email || 'User'
  const planLabel = userPlan.isBusiness ? 'Business' : userPlan.plan === 'free' ? 'Free' : 'Starter'
  const showTrialBanner = userPlan.isTrial && userPlan.trialDaysLeft > 0
  const showPaymentFailedBanner = userPlan.subscriptionStatus === 'past_due'
  const hasTopBanner = showTrialBanner || showPaymentFailedBanner

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      if (isDemoMode) {
        router.push('/')
        return
      }

      const supabase = getSupabaseBrowserClient()
      if (supabase) {
        await supabase.auth.signOut()
      }
      router.push('/login')
      router.refresh()
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-[#eef2f7] font-['Inter'] text-[#1b2540]">
      <div
        className={cn(
          'fixed inset-0 z-40 bg-[#1b2540]/45 transition-opacity md:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-[#d9e1ef] bg-white transition-all duration-200',
          sidebarWidthClass,
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex h-[60px] items-center border-b border-[#e5ebf5] px-4">
          {collapsed ? (
            <Link href={homeHref} aria-label="Clarityboard Home" className="mx-auto">
              <Image
                src="/assets/logo/icon-light-32x32.png"
                alt="Clarityboard"
                width={28}
                height={28}
                className="h-7 w-7"
              />
            </Link>
          ) : (
            <ClarityboardLogo href={homeHref} imageClassName="h-8 w-auto" />
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActivePath(pathname, item.href)
            const locked = Boolean(item.businessOnly && !userPlan.isBusiness)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-[#4285f4] text-white'
                    : 'bg-transparent text-[#1b2540] hover:bg-[#eef2f7]'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={cn('truncate', collapsed && 'hidden')}>{item.label}</span>
                {locked ? (
                  <Lock className={cn('ml-auto h-4 w-4 shrink-0', active ? 'text-white' : 'text-[#6b7a99]')} />
                ) : null}
              </Link>
            )
          })}
        </nav>
      </aside>

      <header
        className={cn(
          'fixed left-0 right-0 top-0 z-30 flex h-[60px] items-center justify-between border-b border-[#d9e1ef] bg-white px-4 md:px-6',
          contentOffsetClass
        )}
      >
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-[#1b2540]"
            onClick={() => {
              if (window.matchMedia('(min-width: 768px)').matches) {
                setCollapsed((value) => !value)
              } else {
                setMobileOpen((value) => !value)
              }
            }}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-[#1b2540]">{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(insightsHref)}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d9e1ef] text-[#1b2540]"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-1.5 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </button>

          <Badge className="rounded-full bg-[#4285f4]/10 px-3 py-1 text-xs font-semibold text-[#4285f4]">
            {planLabel}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-[#d9e1ef] py-1 pl-1 pr-2"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.avatarUrl ?? '/placeholder-user.jpg'} alt={userLabel} />
                  <AvatarFallback className="bg-[#eef2f7] text-xs text-[#1b2540]">
                    {getInitials(userLabel)}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 text-[#6b7a99]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => router.push(settingsHref)}>
                Account
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  void handleSignOut()
                }}
                disabled={isSigningOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isDemoMode ? 'Back to home' : 'Logout'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {showTrialBanner ? (
        <div
          className={cn(
            'fixed left-0 right-0 top-[60px] z-20 flex min-h-11 items-center justify-between border-b border-[#d9e1ef] bg-[#1b2540] px-4 py-2 text-sm text-white md:px-6',
            contentOffsetClass
          )}
        >
          <p>
            {userPlan.trialDaysLeft} day{userPlan.trialDaysLeft === 1 ? '' : 's'} left in your trial
            {' '} - Upgrade now
          </p>
          <Button
            size="sm"
            className="bg-[#4285f4] text-white hover:bg-[#4285f4]/90"
            onClick={() => void openCheckout('business')}
            disabled={checkoutLoading}
          >
            {checkoutLoading ? 'Opening...' : 'Upgrade now'}
          </Button>
        </div>
      ) : null}

      {!showTrialBanner && showPaymentFailedBanner ? (
        <div
          className={cn(
            'fixed left-0 right-0 top-[60px] z-20 flex min-h-11 items-center justify-between border-b border-[#d9e1ef] bg-[#ef4444] px-4 py-2 text-sm text-white md:px-6',
            contentOffsetClass
          )}
        >
          <p>Payment failed. Update billing details to keep your dashboard access.</p>
          <Button
            size="sm"
            className="bg-white text-[#ef4444] hover:bg-white/90"
            onClick={() => void openPortal()}
            disabled={portalLoading}
          >
            {portalLoading ? 'Opening...' : 'Manage billing'}
          </Button>
        </div>
      ) : null}

      <main
        className={cn(
          'fixed bottom-0 left-0 right-0 overflow-y-auto p-4 md:p-6',
          hasTopBanner ? 'top-[104px]' : 'top-[60px]',
          contentOffsetClass
        )}
      >
        {children}
      </main>
    </div>
  )
}
