'use client'

import { useState } from 'react'

export function SettingsClient() {
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const runAction = async (action: 'disconnect' | 'delete') => {
    setBusy(true)
    setMessage(null)

    if (action === 'disconnect') {
      const res = await fetch('/api/reports/google/disconnect', { method: 'POST' })
      const json = await res.json()
      setMessage(res.ok ? 'Google disconnected and jobs paused.' : json?.error?.message ?? 'Failed to disconnect')
    }

    if (action === 'delete') {
      const confirmed = window.confirm('Delete workspace data permanently? This cannot be undone.')
      if (!confirmed) {
        setBusy(false)
        return
      }

      const res = await fetch('/api/reports/compliance/delete', { method: 'DELETE' })
      const json = await res.json()
      setMessage(res.ok ? 'Workspace deleted.' : json?.error?.message ?? 'Failed to delete workspace')
    }

    setBusy(false)
  }

  return (
    <section className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">Security and Compliance</h2>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => window.open('/api/reports/compliance/export', '_blank')} className="rounded bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950">
          Export Data
        </button>
        <button onClick={() => void runAction('disconnect')} disabled={busy} className="rounded bg-amber-400 px-4 py-2 text-sm font-medium text-slate-950">
          Disconnect Google
        </button>
        <button onClick={() => void runAction('delete')} disabled={busy} className="rounded bg-rose-500 px-4 py-2 text-sm font-medium text-white">
          Delete Workspace Data
        </button>
      </div>
      {message ? <p className="text-sm text-slate-200">{message}</p> : null}
    </section>
  )
}

