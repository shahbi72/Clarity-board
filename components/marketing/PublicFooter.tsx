'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const FOOTER_LINKS: Array<{ href: string; label: string }> = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/refunds', label: 'Refunds' },
  { href: '/contact', label: 'Contact' },
]

function shouldRenderPublicFooter(pathname: string): boolean {
  if (pathname.startsWith('/app')) {
    return false
  }

  return true
}

export function PublicFooter() {
  const pathname = usePathname()

  if (!shouldRenderPublicFooter(pathname)) {
    return null
  }

  return (
    <footer className="border-t border-border/70 bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-col sm:items-end">
          <span>{`\u00a9 ${new Date().getFullYear()} Clarityboard`}</span>
          <a href="mailto:clarityboard.app@gmail.com" className="hover:text-foreground">
            clarityboard.app@gmail.com
          </a>
        </div>
      </div>
    </footer>
  )
}
