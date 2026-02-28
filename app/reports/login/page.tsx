'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export default function ReportsLoginPage() {
  const [loading, setLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setLoading(true)
    await signIn('google', { callbackUrl: '/reports/dashboard' })
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Clarityboard Reports</p>
        <h1 className="text-3xl font-semibold">Sign in to connect Google Sheets</h1>
        <p className="max-w-md text-sm text-slate-300">
          Connect a spreadsheet, keep it synced, and ship automated weekly KPI reports.
        </p>
        <Button onClick={handleGoogleSignIn} disabled={loading} className="w-full max-w-xs">
          {loading ? 'Redirecting...' : 'Continue with Google'}
        </Button>
        {process.env.NEXT_PUBLIC_REPORTS_DEMO_AUTH === '1' ? (
          <a className="text-sm text-cyan-300 hover:text-cyan-200" href="/reports/dashboard">
            Continue in demo mode
          </a>
        ) : null}
      </section>
    </main>
  )
}

