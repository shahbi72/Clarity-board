'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  CreditCard,
  Database,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  MessageSquare,
  Package,
  Search,
  Settings,
  Shield,
  Sparkles,
  UploadCloud,
  UserCircle2,
  Users,
  Star,
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

type NavSection = {
  title: string
  items: NavItem[]
}

const CORE_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Upload Data', href: '/upload', icon: UploadCloud },
  { label: 'Datasets', href: '/datasets', icon: Database },
  { label: 'Records', href: '/records', icon: FileText },
]

const AI_NAV_ITEMS: NavItem[] = [
  { label: 'AI Assistant', href: '/assistant', icon: MessageSquare },
  { label: 'AI Suggestions', href: '/suggestions', icon: Lightbulb },
  { label: 'Reports', href: '/suggestions', icon: BarChart3 },
]

const FEATURE_NAV_ITEMS: NavItem[] = [
  { label: 'Pricing', href: '/pricing', icon: CreditCard },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Features', href: '/features', icon: Star },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Help', href: '/help', icon: HelpCircle },
  { label: 'Privacy Policy', href: '/privacy-policy', icon: Shield },
]

function isActivePath(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === '/dashboard'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Sidebar({ className, mobile = false, onNavigate, datasetsCount = 0 }: SidebarProps) {
  const pathname = usePathname()

  const coreNavItems = CORE_NAV_ITEMS.map((item) =>
    item.label === 'Datasets' ? { ...item, badge: datasetsCount } : item
  )
  const sections: NavSection[] = [
    { title: 'Main', items: coreNavItems },
    { title: 'AI Tools', items: AI_NAV_ITEMS },
    { title: 'Features', items: FEATURE_NAV_ITEMS },
  ]

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
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Workspace</p>
          <p className="text-base font-semibold text-slate-900">Clarityboard</p>
        </div>
      </div>

      <div className="mt-6">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Search reports and datasets"
            placeholder="Search reports, datasets..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-700 outline-none transition-all duration-200 focus:border-slate-300 focus:bg-white"
          />
        </label>
      </div>

      <div className="mt-6 flex-1 space-y-5 overflow-y-auto pb-2">
        {sections.map((section) => (
          <section key={section.title} className="space-y-1.5">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {section.title}
            </p>
            <nav aria-label={`${section.title} navigation`} className="space-y-1.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = isActivePath(pathname, item.href)

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-label={item.label}
                    onClick={onNavigate}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                    {typeof item.badge === 'number' ? (
                      <span
                        className={cn(
                          'ml-auto inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold',
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </nav>
          </section>
        ))}
      </div>

      <div className="mt-auto space-y-3 pt-6">
        <button
          type="button"
          aria-label="Upgrade plan"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-700"
        >
          <Zap className="size-4" />
          <span>Upgrade Plan</span>
        </button>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <UserCircle2 className="size-8 text-slate-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Shahbaz</p>
              <p className="text-xs text-slate-500">Account settings</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
