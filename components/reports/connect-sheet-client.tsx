'use client'

import { useEffect, useState } from 'react'

type Spreadsheet = {
  id: string
  name: string
  modifiedTime: string | null
}

type SheetTab = {
  id: number | null
  name: string
}

type ConnectedSource = {
  id: string
  spreadsheetName: string
  sheetName: string
  dataset?: { id: string; rowCount: number } | null
}

export function ConnectSheetClient() {
  const [query, setQuery] = useState('')
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([])
  const [tabs, setTabs] = useState<SheetTab[]>([])
  const [selectedSheet, setSelectedSheet] = useState<Spreadsheet | null>(null)
  const [selectedTab, setSelectedTab] = useState<SheetTab | null>(null)
  const [sources, setSources] = useState<ConnectedSource[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const loadSources = async () => {
    const res = await fetch('/api/reports/sheet-sources', { cache: 'no-store' })
    const json = await res.json()
    if (res.ok) {
      setSources((json.data ?? []) as ConnectedSource[])
    }
  }

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadSources()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [])

  const searchSpreadsheets = async () => {
    setLoading(true)
    setMessage(null)
    const params = new URLSearchParams({ limit: '20' })
    if (query.trim()) params.set('q', query.trim())

    const res = await fetch(`/api/reports/google/spreadsheets?${params.toString()}`, { cache: 'no-store' })
    const json = await res.json()

    if (res.ok) {
      setSpreadsheets((json.data ?? []) as Spreadsheet[])
    } else {
      setMessage(json?.error?.message ?? 'Failed to list spreadsheets')
    }
    setLoading(false)
  }

  const loadTabs = async (sheet: Spreadsheet) => {
    setSelectedSheet(sheet)
    setSelectedTab(null)
    const res = await fetch(`/api/reports/google/spreadsheets/${sheet.id}/sheets`, { cache: 'no-store' })
    const json = await res.json()

    if (res.ok) {
      setTabs((json.data ?? []) as SheetTab[])
    } else {
      setMessage(json?.error?.message ?? 'Failed to load sheets')
    }
  }

  const connect = async () => {
    if (!selectedSheet || !selectedTab) return
    setLoading(true)
    setMessage(null)

    const res = await fetch('/api/reports/sheet-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spreadsheetId: selectedSheet.id,
        spreadsheetName: selectedSheet.name,
        sheetName: selectedTab.name,
        sheetId: selectedTab.id,
      }),
    })

    const json = await res.json()
    if (res.ok) {
      setMessage('Sheet connected and initial sync completed.')
      await loadSources()
    } else {
      setMessage(json?.error?.message ?? 'Failed to connect sheet')
    }

    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-lg font-semibold">Connect Google Sheet</h2>
        <div className="mt-3 flex gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search spreadsheets"
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <button
            onClick={() => void searchSpreadsheets()}
            disabled={loading}
            className="rounded bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950"
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>

        {message ? <p className="mt-3 text-sm text-slate-300">{message}</p> : null}

        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {spreadsheets.map((sheet) => (
            <button
              key={sheet.id}
              onClick={() => void loadTabs(sheet)}
              className="rounded border border-slate-700 p-3 text-left hover:border-cyan-400"
            >
              <p className="font-medium">{sheet.name}</p>
              <p className="text-xs text-slate-400">{sheet.id}</p>
            </button>
          ))}
        </div>

        {selectedSheet ? (
          <div className="mt-4 rounded border border-slate-700 p-3">
            <p className="text-sm">Selected spreadsheet: {selectedSheet.name}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => setSelectedTab(tab)}
                  className={`rounded border px-3 py-1 text-sm ${
                    selectedTab?.name === tab.name
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                      : 'border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => void connect()}
              disabled={!selectedTab || loading}
              className="mt-4 rounded bg-emerald-400 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
            >
              Connect and Sync
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-lg font-semibold">Connected Sources</h2>
        <div className="mt-3 space-y-2">
          {sources.map((source) => (
            <article key={source.id} className="rounded border border-slate-700 p-3">
              <p className="font-medium">{source.spreadsheetName}</p>
              <p className="text-sm text-slate-300">Tab: {source.sheetName}</p>
              <p className="text-xs text-slate-400">Rows: {source.dataset?.rowCount ?? 0}</p>
            </article>
          ))}
          {sources.length === 0 ? <p className="text-sm text-slate-300">No connected sheets yet.</p> : null}
        </div>
      </section>
    </div>
  )
}

