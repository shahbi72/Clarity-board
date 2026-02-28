'use client'

export default function ReportsError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="rounded border border-rose-500/40 bg-rose-950/30 p-4">
      <h2 className="text-lg font-semibold text-rose-100">Reports module error</h2>
      <p className="mt-2 text-sm text-rose-200">{error.message || 'Unexpected reports error.'}</p>
      <button onClick={reset} className="mt-3 rounded bg-rose-400 px-3 py-2 text-sm font-medium text-slate-950">
        Retry
      </button>
    </div>
  )
}

