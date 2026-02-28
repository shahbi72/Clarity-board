'use client'

import { useEffect, useState } from 'react'

type ReportItem = {
  id: string
  status: string
  reportType: string
  recipientEmail: string
  subject: string
  createdAt: string
  sentAt: string | null
}

export function ReportsHistoryClient() {
  const [reports, setReports] = useState<ReportItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/reports/reports', { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) {
        setReports((json.data ?? []) as ReportItem[])
      }
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return <p className="text-sm text-slate-300">Loading reports...</p>
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">Sent Reports</h2>
      <div className="mt-3 space-y-2">
        {reports.map((report) => (
          <article key={report.id} className="rounded border border-slate-700 p-3">
            <p className="font-medium">{report.subject}</p>
            <p className="text-sm text-slate-300">To: {report.recipientEmail}</p>
            <p className="text-xs text-slate-400">
              {report.status} | Created: {report.createdAt} | Sent: {report.sentAt ?? 'not sent'}
            </p>
          </article>
        ))}
        {reports.length === 0 ? <p className="text-sm text-slate-300">No reports yet.</p> : null}
      </div>
    </section>
  )
}

