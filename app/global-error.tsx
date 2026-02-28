'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <html>
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-slate-300">{error.message || 'Unexpected application error.'}</p>
          <button onClick={reset} className="rounded bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950">
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}

