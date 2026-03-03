'use client'

import { usePathname } from 'next/navigation'
import { PublicFooter } from '@/components/marketing/PublicFooter'

export function PublicFooterGate() {
  const pathname = usePathname()

  if (pathname.startsWith('/dashboard')) {
    return null
  }

  return <PublicFooter />
}
