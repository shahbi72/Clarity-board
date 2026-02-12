import React from "react"
import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, Work_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
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
  description: 'Upload any file type - CSV, Excel, PDF, JSON, images. ClarityBoard automatically cleans, structures, and analyzes your data into powerful business dashboards.',
  keywords: ['business intelligence', 'data analytics', 'dashboard', 'data cleaning', 'AI insights'],
    generator: 'v0.app'
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f8ff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1020' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${workSans.variable} ${plexMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
