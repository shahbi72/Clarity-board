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
  UploadCloud,
  UserCircle2,
  Users,
  Star,
  Zap,
} from 'lucide-react'
import type { ComponentType } from 'react'

import { ClarityboardLogo } from '@/components/branding/ClarityboardLogo'
import { cn } from '@/lib/utils'
import { useI18n } from '@/components/language/language-provider'

type SidebarProps = {
  className?: string
  mobile?: boolean
  onNavigate?: () => void
  datasetsCount?: number
}

type NavItem = {
  labelKey: string
  href: string
  icon: ComponentType<{ className?: string }>
  badge?: number
}

type NavSection = {
  titleKey: string
  items: NavItem[]
}

const CORE_NAV_ITEMS: NavItem[] = [
  { labelKey: 'items.dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { labelKey: 'items.uploadData', href: '/app/upload', icon: UploadCloud },
  { labelKey: 'items.datasets', href: '/app/datasets', icon: Database },
  { labelKey: 'items.records', href: '/app/records', icon: FileText },
]

const AI_NAV_ITEMS: NavItem[] = [
  { labelKey: 'items.aiAssistant', href: '/app/ai-assistant', icon: MessageSquare },
  { labelKey: 'items.aiSuggestions', href: '/suggestions', icon: Lightbulb },
  { labelKey: 'items.reports', href: '/suggestions', icon: BarChart3 },
]

const FEATURE_NAV_ITEMS: NavItem[] = [
  { labelKey: 'items.pricing', href: '/pricing', icon: CreditCard },
  { labelKey: 'items.users', href: '/users', icon: Users },
  { labelKey: 'items.features', href: '/features', icon: Star },
  { labelKey: 'items.products', href: '/products', icon: Package },
  { labelKey: 'items.settings', href: '/settings', icon: Settings },
  { labelKey: 'items.help', href: '/help', icon: HelpCircle },
  { labelKey: 'items.privacyPolicy', href: '/privacy-policy', icon: Shield },
]

function isActivePath(pathname: string, href: string) {
  if (href === '/app/dashboard') {
    return pathname === '/app/dashboard' || pathname === '/app'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Sidebar({ className, mobile = false, onNavigate, datasetsCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const { t } = useI18n()
  const tSidebar = (key: string) => t(`sidebar.${key}`)

  const coreNavItems = CORE_NAV_ITEMS.map((item) =>
    item.href === '/app/datasets' ? { ...item, badge: datasetsCount } : item
  )
  const sections: NavSection[] = [
    { titleKey: 'sections.main', items: coreNavItems },
    { titleKey: 'sections.aiTools', items: AI_NAV_ITEMS },
    { titleKey: 'sections.features', items: FEATURE_NAV_ITEMS },
  ]

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-card px-3 py-4',
        mobile ? 'w-full' : 'w-full',
        className
      )}
    >
      <div className="space-y-2 px-2">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{tSidebar('workspace')}</p>
        <div>
          <ClarityboardLogo
            href="/"
            withBackground
            imageClassName="h-8 w-auto"
          />
        </div>
      </div>

      <div className="mt-6">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            aria-label={tSidebar('searchAria')}
            placeholder={tSidebar('searchPlaceholder')}
            className="h-10 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm text-foreground outline-none transition-all duration-200 focus:border-ring focus:bg-background"
          />
        </label>
      </div>

      <div className="mt-6 flex-1 space-y-5 overflow-y-auto pb-2">
        {sections.map((section) => (
          <section key={section.titleKey} className="space-y-1.5">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {tSidebar(section.titleKey)}
            </p>
            <nav aria-label={`${tSidebar(section.titleKey)} navigation`} className="space-y-1.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = isActivePath(pathname, item.href)
                const itemLabel = tSidebar(item.labelKey)

                return (
                  <Link
                    key={item.labelKey}
                    href={item.href}
                    aria-label={itemLabel}
                    onClick={onNavigate}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{itemLabel}</span>
                    {typeof item.badge === 'number' ? (
                      <span
                        className={cn(
                          'ml-auto inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold',
                          isActive
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
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
          aria-label={tSidebar('upgradePlan')}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90"
        >
          <Zap className="size-4" />
          <span>{tSidebar('upgradePlan')}</span>
        </button>

        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <div className="flex items-center gap-3">
            <UserCircle2 className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">Shahbaz</p>
              <p className="text-xs text-muted-foreground">{tSidebar('accountSettings')}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
