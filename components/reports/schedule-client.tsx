'use client'

import { useEffect, useState } from 'react'

type Source = { id: string; spreadsheetName: string; sheetName: string }

type Schedule = {
  enabled: boolean
  dayOfWeek: number
  timeOfDay: string
  timezone: string
  recipientEmail: string | null
  sheetSourceId: string | null
  nextRunAt: string | null
}

export function ScheduleClient() {
  const [sources, setSources] = useState<Source[]>([])
  const [schedule, setSchedule] = useState<Schedule>({
    enabled: true,
    dayOfWeek: 1,
    timeOfDay: '09:00',
    timezone: 'Europe/Istanbul',
    recipientEmail: null,
    sheetSourceId: null,
    nextRunAt: null,
  })
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void (async () => {
      const [sourceRes, scheduleRes] = await Promise.all([
        fetch('/api/reports/sheet-sources', { cache: 'no-store' }),
        fetch('/api/reports/schedule', { cache: 'no-store' }),
      ])

      const sourceJson = await sourceRes.json()
      const scheduleJson = await scheduleRes.json()

      if (sourceRes.ok) {
        setSources((sourceJson.data ?? []).map((item: any) => ({ id: item.id, spreadsheetName: item.spreadsheetName, sheetName: item.sheetName })))
      }

      if (scheduleRes.ok && scheduleJson.data) {
        setSchedule({
          enabled: scheduleJson.data.enabled,
          dayOfWeek: scheduleJson.data.dayOfWeek,
          timeOfDay: scheduleJson.data.timeOfDay,
          timezone: scheduleJson.data.timezone,
          recipientEmail: scheduleJson.data.recipientEmail,
          sheetSourceId: scheduleJson.data.sheetSourceId,
          nextRunAt: scheduleJson.data.nextRunAt,
        })
      }
    })()
  }, [])

  const save = async () => {
    setLoading(true)
    setMessage(null)

    const res = await fetch('/api/reports/schedule', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedule),
    })

    const json = await res.json()
    if (res.ok) {
      setMessage('Schedule saved.')
      setSchedule((prev) => ({ ...prev, nextRunAt: json.data.nextRunAt }))
    } else {
      setMessage(json?.error?.message ?? 'Failed to save schedule')
    }

    setLoading(false)
  }

  const sendNow = async () => {
    setLoading(true)
    setMessage(null)

    const res = await fetch('/api/reports/reports/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetSourceId: schedule.sheetSourceId, recipientEmail: schedule.recipientEmail }),
    })

    const json = await res.json()
    if (res.ok) {
      setMessage('Report sent successfully.')
    } else {
      setMessage(json?.error?.message ?? 'Failed to send report')
    }

    setLoading(false)
  }

  return (
    <section className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">Weekly Schedule</h2>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={schedule.enabled}
          onChange={(event) => setSchedule((prev) => ({ ...prev, enabled: event.target.checked }))}
        />
        Enable weekly email
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          Day of week
          <select
            value={schedule.dayOfWeek}
            onChange={(event) => setSchedule((prev) => ({ ...prev, dayOfWeek: Number(event.target.value) }))}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
          >
            <option value={1}>Monday</option>
            <option value={2}>Tuesday</option>
            <option value={3}>Wednesday</option>
            <option value={4}>Thursday</option>
            <option value={5}>Friday</option>
            <option value={6}>Saturday</option>
            <option value={0}>Sunday</option>
          </select>
        </label>

        <label className="text-sm">
          Time
          <input
            type="time"
            value={schedule.timeOfDay}
            onChange={(event) => setSchedule((prev) => ({ ...prev, timeOfDay: event.target.value }))}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
          />
        </label>

        <label className="text-sm">
          Timezone
          <input
            value={schedule.timezone}
            onChange={(event) => setSchedule((prev) => ({ ...prev, timezone: event.target.value }))}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
          />
        </label>

        <label className="text-sm">
          Recipient email
          <input
            type="email"
            value={schedule.recipientEmail ?? ''}
            onChange={(event) => setSchedule((prev) => ({ ...prev, recipientEmail: event.target.value || null }))}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
          />
        </label>
      </div>

      <label className="text-sm">
        Data source
        <select
          value={schedule.sheetSourceId ?? ''}
          onChange={(event) => setSchedule((prev) => ({ ...prev, sheetSourceId: event.target.value || null }))}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
        >
          <option value="">Latest active source</option>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.spreadsheetName} / {source.sheetName}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => void save()} disabled={loading} className="rounded bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950">
          Save Schedule
        </button>
        <button onClick={() => void sendNow()} disabled={loading} className="rounded bg-emerald-400 px-4 py-2 text-sm font-medium text-slate-950">
          Send Report Now
        </button>
      </div>

      {schedule.nextRunAt ? <p className="text-xs text-slate-300">Next run: {schedule.nextRunAt}</p> : null}
      {message ? <p className="text-sm text-slate-200">{message}</p> : null}
    </section>
  )
}

