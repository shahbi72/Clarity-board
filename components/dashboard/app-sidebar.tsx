'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Upload,
  Database,
  Table2,
  MessageSquare,
  Lightbulb,
  CreditCard,
  Settings,
  HelpCircle,
  Sparkles,
  Search,
  Users,
  Star,
  Package,
  Shield,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const mainNavItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Upload Data',
    href: '/upload',
    icon: Upload,
  },
  {
    title: 'Datasets',
    href: '/datasets',
    icon: Database,
    badge: '5',
  },
  {
    title: 'Records',
    href: '/records',
    icon: Table2,
  },
]

const aiNavItems = [
  {
    title: 'AI Assistant',
    href: '/assistant',
    icon: MessageSquare,
  },
  {
    title: 'Smart Suggestions',
    href: '/suggestions',
    icon: Lightbulb,
    badge: '4',
  },
]

const settingsNavItems = [
  {
    title: 'Pricing',
    href: '/pricing',
    icon: CreditCard,
  },
  {
    title: 'Users',
    href: '/users',
    icon: Users,
  },
  {
    title: 'Features',
    href: '/features',
    icon: Star,
  },
  {
    title: 'Products',
    href: '/products',
    icon: Package,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
  {
    title: 'Help',
    href: '/help',
    icon: HelpCircle,
  },
  {
    title: 'Privacy Policy',
    href: '/privacy-policy',
    icon: Shield,
  },
]

interface AppSidebarProps {
  className?: string
  onNavigate?: () => void
}

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar({ className, onNavigate }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className={cn('flex h-full flex-col bg-white', className)}>
      <div className="border-b border-slate-200/70 px-5 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="icon-chip icon-chip-primary h-9 w-9">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold text-slate-900">Clarityboard</span>
            <span className="text-xs text-slate-500">Accounting overview</span>
          </div>
        </Link>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        <div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search reports, invoices..."
              className="h-9 rounded-lg border-slate-200 bg-slate-50 pl-9 text-sm"
            />
          </div>
        </div>

        <section className="space-y-2">
          <h2 className="px-2 text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Dashboard
          </h2>
          <nav className="space-y-1" aria-label="Dashboard">
              {mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900',
                    isActivePath(pathname, item.href) && 'bg-blue-50 text-blue-700'
                  )}
                >
                  <span
                    className={cn(
                      'icon-chip h-8 w-8',
                      isActivePath(pathname, item.href) ? 'icon-chip-primary' : 'icon-chip-muted'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span>{item.title}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto rounded-md bg-slate-100 text-xs text-slate-600">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              ))}
          </nav>
        </section>

        <div className="border-t border-slate-200/70" />

        <section className="space-y-2">
          <h2 className="px-2 text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            AI Tools
          </h2>
          <nav className="space-y-1" aria-label="AI tools">
              {aiNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900',
                    isActivePath(pathname, item.href) && 'bg-blue-50 text-blue-700'
                  )}
                >
                  <span
                    className={cn(
                      'icon-chip h-8 w-8',
                      isActivePath(pathname, item.href) ? 'icon-chip-primary' : 'icon-chip-muted'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span>{item.title}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto rounded-md bg-slate-100 text-xs text-slate-600">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              ))}
          </nav>
        </section>

        <div className="border-t border-slate-200/70" />

        <section className="space-y-2">
          <h2 className="px-2 text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Pages
          </h2>
          <nav className="space-y-1" aria-label="Pages">
              {settingsNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900',
                    isActivePath(pathname, item.href) && 'bg-blue-50 text-blue-700'
                  )}
                >
                  <span
                    className={cn(
                      'icon-chip h-8 w-8',
                      isActivePath(pathname, item.href) ? 'icon-chip-accent' : 'icon-chip-muted'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span>{item.title}</span>
                </Link>
              ))}
          </nav>
        </section>
      </div>

      <div className="border-t border-slate-200/70 p-4">
        <div className="space-y-4">
          <Link
            href="/pricing"
            onClick={onNavigate}
            className="block rounded-xl bg-primary px-4 py-3 text-center text-xs font-semibold tracking-[0.14em] text-primary-foreground shadow-[0_18px_40px_-30px_rgba(30,64,175,0.35)] transition hover:bg-primary/90"
          >
            Upgrade plan
          </Link>
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <img
              src="/placeholder-user.jpg"
              alt="User avatar"
              className="h-9 w-9 rounded-full object-cover"
            />
            <div>
              <div className="text-sm font-medium text-slate-900">John Carter</div>
              <div className="text-xs text-slate-500">Account settings</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
