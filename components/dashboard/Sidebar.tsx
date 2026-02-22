'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Database,
  FileText,
  LayoutDashboard,
  Search,
  Settings,
  Sparkles,
  UploadCloud,
  UserCircle2,
  Zap,
} from 'lucide-react'
import type { ComponentType } from 'react'

import { cn } from '@/lib/utils'

type SidebarProps = {
  className?: string
  mobile?: boolean
  onNavigate?: () => void
  datasetsCount?: number
}

type NavItem = {
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
  badge?: number
}

const BASE_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Upload Data', href: '/upload', icon: UploadCloud },
  { label: 'Datasets', href: '/datasets', icon: Database },
  { label: 'Records', href: '/records', icon: FileText },
  { label: 'Reports', href: '/suggestions', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
]

function isActivePath(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === '/dashboard'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Sidebar({ className, mobile = false, onNavigate, datasetsCount = 0 }: SidebarProps) {
  const pathname = usePathname()

  const navItems = BASE_NAV_ITEMS.map((item) =>
    item.label === 'Datasets' ? { ...item, badge: datasetsCount } : item
  )

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-slate-200 bg-white px-3 py-4',
        mobile ? 'w-full' : 'w-full',
        className
      )}
    >
      <div className="flex items-center gap-3 px-2">
        <div className="grid size-10 place-items-center rounded-xl bg-slate-900 text-white shadow-sm">
          <Sparkles className="size-5" />
        </div>
        <div className={cn(mobile ? 'block' : 'hidden xl:block')}>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Workspace</p>
          <p className="text-base font-semibold text-slate-900">Clarityboard</p>
        </div>
      </div>

      <div className={cn('mt-6', mobile ? 'block' : 'hidden xl:block')}>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Search reports and datasets"
            placeholder="Search reports, datasets..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-700 outline-none transition-all duration-200 focus:border-slate-300 focus:bg-white"
          />
        </label>
      </div>

      <button
        type="button"
        aria-label="Search reports and datasets"
        className={cn(
          'mt-5 hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-all duration-200 hover:bg-slate-100',
          mobile ? 'hidden' : 'md:flex xl:hidden'
        )}
      >
        <Search className="size-4" />
      </button>

      <nav aria-label="Primary sidebar navigation" className="mt-6 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = isActivePath(pathname, item.href)

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-label={item.label}
              onClick={onNavigate}
              className={cn(
                'group flex items-center rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200',
                mobile ? 'gap-3 justify-start' : 'justify-center gap-0 md:justify-center xl:justify-start xl:gap-3',
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className={cn(mobile ? 'inline' : 'hidden xl:inline')}>{item.label}</span>
              {typeof item.badge === 'number' ? (
                <span
                  className={cn(
                    'ml-auto inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold',
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700',
                    mobile ? 'inline-flex' : 'hidden xl:inline-flex'
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto space-y-3 pt-6">
        <button
          type="button"
          aria-label="Upgrade plan"
          className={cn(
            'inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-700',
            mobile ? 'gap-2' : 'gap-0 xl:gap-2'
          )}
        >
          <Zap className="size-4" />
          <span className={cn(mobile ? 'inline' : 'hidden xl:inline')}>Upgrade Plan</span>
        </button>

        <div
          className={cn(
            'rounded-xl border border-slate-200 bg-slate-50 p-3',
            mobile ? 'block' : 'hidden xl:block'
          )}
        >
          <div className="flex items-center gap-3">
            <UserCircle2 className="size-8 text-slate-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Shahbaz</p>
              <p className="text-xs text-slate-500">Account settings</p>
            </div>
          </div>
        </div>

        <Link
          href="/settings"
          aria-label="Account settings"
          onClick={onNavigate}
          className={cn(
            'hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-all duration-200 hover:bg-slate-100',
            mobile ? 'hidden' : 'md:flex xl:hidden'
          )}
        >
          <UserCircle2 className="size-5" />
        </Link>
      </div>
    </aside>
  )
}
