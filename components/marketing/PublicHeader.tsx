import Link from 'next/link'
import { ClarityboardLogo } from '@/components/branding/ClarityboardLogo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PublicHeaderProps = {
  activePath?: string
}

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: '/demo', label: 'Demo' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/contact', label: 'Contact' },
]

export function PublicHeader({ activePath }: PublicHeaderProps) {
  return (
    <header className="border-b border-border/70">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <ClarityboardLogo href="/" withBackground imageClassName="h-8 w-auto md:h-10" />

        <nav className="hidden items-center gap-4 md:flex" aria-label="Public navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm text-muted-foreground transition-colors hover:text-foreground',
                activePath === link.href ? 'font-semibold text-foreground' : null
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/pricing">Pricing</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Start Free Trial</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
