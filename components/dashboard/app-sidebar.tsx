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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'

const mainNavItems = [
  {
    title: 'Dashboard',
    href: '/',
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

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar
      variant="floating"
      className="border border-sidebar-border/70 bg-sidebar/95 shadow-[0_18px_36px_-26px_rgba(15,23,42,0.18)]"
    >
      <SidebarHeader className="border-b border-sidebar-border/60 px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="icon-chip icon-chip-primary h-10 w-10">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-sidebar-foreground">Clarityboard</span>
            <span className="text-xs text-muted-foreground">Accounting overview</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <div className="px-4 pt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <SidebarInput placeholder="Search reports, invoices..." className="pl-9 text-sm" />
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className="rounded-lg px-3 py-2 text-sm data-[active=true]:bg-primary/10 data-[active=true]:text-foreground"
                  >
                    <Link href={item.href}>
                      <span
                        className={`icon-chip h-8 w-8 ${pathname === item.href ? 'icon-chip-primary' : 'icon-chip-muted'}`}
                      >
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>AI Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {aiNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className="rounded-lg px-3 py-2 text-sm data-[active=true]:bg-primary/10 data-[active=true]:text-foreground"
                  >
                    <Link href={item.href}>
                      <span
                        className={`icon-chip h-8 w-8 ${pathname === item.href ? 'icon-chip-primary' : 'icon-chip-muted'}`}
                      >
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Pages</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className="rounded-lg px-3 py-2 text-sm data-[active=true]:bg-primary/10 data-[active=true]:text-foreground"
                  >
                    <Link href={item.href}>
                      <span
                        className={`icon-chip h-8 w-8 ${pathname === item.href ? 'icon-chip-accent' : 'icon-chip-muted'}`}
                      >
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 p-4">
        <div className="space-y-4">
          <Link
            href="/pricing"
            className="block rounded-xl bg-primary px-4 py-3 text-center text-xs font-semibold tracking-[0.14em] text-primary-foreground shadow-[0_18px_40px_-30px_rgba(30,64,175,0.35)] transition hover:bg-primary/90"
          >
            Upgrade plan
          </Link>
          <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-card p-3">
            <img
              src="/placeholder-user.jpg"
              alt="User avatar"
              className="h-9 w-9 rounded-full object-cover"
            />
            <div>
              <div className="text-sm font-medium text-sidebar-foreground">John Carter</div>
              <div className="text-xs text-muted-foreground">Account settings</div>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
