'use client'

import React from 'react'
import { PanelLeft } from 'lucide-react'
import { usePathname } from 'next/navigation'

import { Sidebar } from '@/components/dashboard/Sidebar'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const DATASET_COUNT = 12
const DESKTOP_QUERY = '(min-width: 1024px)'

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [isDesktop, setIsDesktop] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_QUERY)
    setIsDesktop(mediaQuery.matches)

    const handleMediaChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches)
    }

    mediaQuery.addEventListener('change', handleMediaChange)
    return () => mediaQuery.removeEventListener('change', handleMediaChange)
  }, [])

  React.useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  React.useEffect(() => {
    if (isDesktop) {
      setMobileOpen(false)
    }
  }, [isDesktop])

  React.useEffect(() => {
    document.body.style.overflow = mobileOpen && !isDesktop ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen, isDesktop])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <Sidebar className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:flex" datasetsCount={DATASET_COUNT} />

        <div className="flex min-h-screen flex-1 flex-col lg:pl-72">
          <header className="sticky top-0 z-30 flex h-14 items-center border-b border-slate-200 bg-slate-50/95 px-4 backdrop-blur lg:hidden">
            <button
              type="button"
              aria-label="Open navigation drawer"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-100"
            >
              <PanelLeft className="size-4" />
            </button>
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </div>

      <button
        type="button"
        aria-label="Close navigation drawer"
        onClick={() => setMobileOpen(false)}
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/35 transition-all duration-200 lg:hidden',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 max-w-[88vw] border-r border-slate-200 bg-white shadow-xl transition-all duration-200 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar mobile onNavigate={() => setMobileOpen(false)} datasetsCount={DATASET_COUNT} />
      </aside>
    </div>
  )
}
