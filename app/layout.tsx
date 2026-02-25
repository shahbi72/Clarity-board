import React from 'react'
import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { IBM_Plex_Mono, Work_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { LanguageProvider } from '@/components/language/language-provider'
import { Toaster } from '@/components/ui/toaster'
import {
  DEFAULT_LANGUAGE,
  getLanguageDirection,
  isLanguageCode,
  LANGUAGE_COOKIE_KEY,
  type LanguageCode,
} from '@/lib/language'
import { getSupabaseServerClient, isSupabaseAuthConfigured } from '@/lib/supabase/server'
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://clarity-board-ui-build.vercel.app'
  ),
  title: 'ClarityBoard - Transform Messy Data into Business Insights',
  description:
    'Upload any file type - CSV, Excel, PDF, JSON, images. ClarityBoard automatically cleans, structures, and analyzes your data into powerful business dashboards.',
  keywords: ['business intelligence', 'data analytics', 'dashboard', 'data cleaning', 'AI insights'],
  openGraph: {
    title: 'ClarityBoard - Transform Messy Data into Business Insights',
    description:
      'Upload any file type - CSV, Excel, PDF, JSON, images. ClarityBoard automatically cleans, structures, and analyzes your data into powerful business dashboards.',
    images: [
      {
        url: '/assets/logo/clarityboard-logo.png',
        width: 865,
        height: 233,
        alt: 'Clarityboard Logo',
      },
    ],
  },
  icons: {
    icon: [
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: ['/favicon-32x32.png'],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
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

async function getInitialLanguage(): Promise<LanguageCode> {
  const cookieStore = await cookies()
  const cookieLanguage = cookieStore.get(LANGUAGE_COOKIE_KEY)?.value ?? null
  let language: LanguageCode = isLanguageCode(cookieLanguage) ? cookieLanguage : DEFAULT_LANGUAGE

  if (!isSupabaseAuthConfigured()) {
    return language
  }

  try {
    const supabase = await getSupabaseServerClient()
    if (!supabase) {
      return language
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return language
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('language')
      .eq('user_id', user.id)
      .maybeSingle<{ language: string | null }>()

    const profileLanguage = profile?.language ?? null
    if (isLanguageCode(profileLanguage)) {
      language = profileLanguage
    }
  } catch {
    // Use cookie/default language when profile lookup fails.
  }

  return language
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const envLabel = getDeployEnvLabel()
  const shortSha = getShortCommitSha()
  const renderAnalytics = shouldRenderAnalytics()
  const initialLanguage = await getInitialLanguage()

  return (
    <html
      lang={initialLanguage}
      dir={getLanguageDirection(initialLanguage)}
      suppressHydrationWarning
    >
      <body className={`${workSans.variable} ${plexMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider initialLanguage={initialLanguage}>
            <DashboardLayout>{children}</DashboardLayout>
            <Toaster />
          </LanguageProvider>
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
