import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireReportsAuthContext } from '@/lib/reports/auth/context'

export default async function ReportsProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    await requireReportsAuthContext()
  } catch {
    redirect('/reports/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 text-sm">
          <Link href="/reports/dashboard" className="rounded px-3 py-1 hover:bg-slate-800">
            Dashboard
          </Link>
          <Link href="/reports/connect" className="rounded px-3 py-1 hover:bg-slate-800">
            Connect Sheet
          </Link>
          <Link href="/reports/schedule" className="rounded px-3 py-1 hover:bg-slate-800">
            Schedule
          </Link>
          <Link href="/reports/reports" className="rounded px-3 py-1 hover:bg-slate-800">
            Reports
          </Link>
          <Link href="/reports/billing" className="rounded px-3 py-1 hover:bg-slate-800">
            Billing
          </Link>
          <Link href="/reports/settings" className="rounded px-3 py-1 hover:bg-slate-800">
            Settings
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}

