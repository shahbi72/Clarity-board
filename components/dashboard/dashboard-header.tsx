'use client'

import { Bell, Search, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HeaderAuthMenu } from '@/components/auth/HeaderAuthMenu'
import { useI18n } from '@/components/language/language-provider'

interface DashboardHeaderProps {
  title: string
  description?: string
}

export function DashboardHeader({ title, description }: DashboardHeaderProps) {
  const { t } = useI18n()
  const tAuth = (key: string) => t(`auth.${key}`)
  const tCommon = (key: string) => t(`common.${key}`)
  const { setTheme, resolvedTheme } = useTheme()

  return (
    <header className="flex min-h-16 items-center justify-between border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
          <Input
            placeholder={tCommon('searchDatasets')}
            className="w-64 pl-9 rtl:pl-3 rtl:pr-9"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{tAuth('toggleTheme')}</span>
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
          <span className="sr-only">{tAuth('notifications')}</span>
        </Button>

        <HeaderAuthMenu />
      </div>
    </header>
  )
}
