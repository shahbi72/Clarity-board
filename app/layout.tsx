import React from 'react'
import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, Work_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'ClarityBoard - Transform Messy Data into Business Insights',
  description:
    'Upload any file type - CSV, Excel, PDF, JSON, images. ClarityBoard automatically cleans, structures, and analyzes your data into powerful business dashboards.',
  keywords: ['business intelligence', 'data analytics', 'dashboard', 'data cleaning', 'AI insights'],
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f8ff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1020' },
  ],
}

function getDeployEnvLabel(): 'Production' | 'Preview' {
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV
  return vercelEnv === 'production' ? 'Production' : 'Preview'
}

function getShortCommitSha(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local'
}

function shouldRenderAnalytics(): boolean {
  return process.env.NODE_ENV === 'production' && process.env.VERCEL === '1'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const envLabel = getDeployEnvLabel()
  const shortSha = getShortCommitSha()
  const renderAnalytics = shouldRenderAnalytics()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${workSans.variable} ${plexMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <DashboardShell>{children}</DashboardShell>
          <Toaster />
        </ThemeProvider>
        <div
          className="fixed bottom-2 right-2 z-50 rounded-md border border-border/60 bg-background/85 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur"
          data-testid="version-stamp"
        >
          {`Clarityboard | ${envLabel} | ${shortSha}`}
        </div>
        {renderAnalytics ? <Analytics /> : null}
      </body>
    </html>
  )
}
