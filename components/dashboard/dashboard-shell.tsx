'use client'

import React from 'react'
import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { cn } from '@/lib/utils'

interface DashboardShellProps {
  children: React.ReactNode
}

const MOBILE_BREAKPOINT_QUERY = '(max-width: 767px)'

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY)
    setIsMobile(mediaQuery.matches)

    const handleMediaChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
    }

    mediaQuery.addEventListener('change', handleMediaChange)
    return () => mediaQuery.removeEventListener('change', handleMediaChange)
  }, [])

  React.useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }, [pathname, isMobile])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  React.useEffect(() => {
    if (!isMobile) return

    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobile, sidebarOpen])

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="sticky top-0 z-50 flex h-14 items-center border-b border-slate-200/70 bg-[#f8fafc]/95 px-4 backdrop-blur md:px-6">
        <button
          type="button"
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          onClick={() => setSidebarOpen((open) => !open)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      <button
        type="button"
        aria-label="Close sidebar"
        onClick={() => setSidebarOpen(false)}
        className={cn(
          'fixed inset-x-0 bottom-0 top-14 z-40 bg-slate-900/45 transition-opacity duration-300 md:hidden',
          sidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      <aside
        className={cn(
          'fixed left-0 top-14 z-50 h-[calc(100vh-3.5rem)] w-[280px] max-w-[85vw] border-r border-slate-200/70 bg-white shadow-[0_24px_48px_-30px_rgba(15,23,42,0.35)] transition-transform duration-300 ease-out will-change-transform',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <AppSidebar onNavigate={() => isMobile && setSidebarOpen(false)} className="h-full" />
      </aside>

      <main className="relative min-h-[calc(100vh-3.5rem)]">{children}</main>
    </div>
  )
}
