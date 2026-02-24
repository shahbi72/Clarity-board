import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

type ClarityboardLogoProps = {
  href?: string
  className?: string
  imageClassName?: string
  priority?: boolean
  withBackground?: boolean
}

export function ClarityboardLogo({
  href = '/',
  className,
  imageClassName,
  priority = false,
  withBackground = false,
}: ClarityboardLogoProps) {
  const logo = (
    <Image
      src="/assets/logo/clarityboard-logo.png"
      alt="Clarityboard Logo"
      width={865}
      height={233}
      priority={priority}
      className={cn('h-8 w-auto md:h-9', imageClassName)}
    />
  )

  const content = (
    <span
      className={cn(
        'inline-flex items-center pr-2.5',
        withBackground && 'rounded-lg bg-white/95 px-2.5 py-1 shadow-sm'
      )}
    >
      {logo}
    </span>
  )

  if (!href) {
    return <span className={className}>{content}</span>
  }

  return (
    <Link href={href} className={className} aria-label="Clarityboard Home">
      {content}
    </Link>
  )
}
