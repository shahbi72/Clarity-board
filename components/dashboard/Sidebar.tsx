import {
  BarChart3,
  Bot,
  Handshake,
  LayoutDashboard,
  Settings,
  Sparkles,
} from 'lucide-react'

type SidebarProps = {
  className?: string
}

const NAV_ITEMS = [
  { label: 'Overview', icon: LayoutDashboard, active: true },
  { label: 'Agents', icon: Bot, active: false },
  { label: 'Deals', icon: Handshake, active: false },
  { label: 'Reports', icon: BarChart3, active: false },
  { label: 'Settings', icon: Settings, active: false },
]

export function Sidebar({ className }: SidebarProps) {
  return (
    <aside
      className={[
        'border-b border-slate-200 bg-white px-4 py-5 shadow-sm xl:sticky xl:top-0 xl:h-screen xl:border-b-0 xl:border-r xl:px-5 xl:py-7',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-slate-900 text-white">
          <Sparkles className="size-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Analytics</p>
          <p className="text-lg font-semibold text-slate-900">ClarityBoard</p>
        </div>
      </div>

      <nav aria-label="Sidebar navigation" className="mt-8 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.label}
              type="button"
              className={[
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                item.active
                  ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-100'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              ].join(' ')}
              aria-label={item.label}
            >
              <Icon className="size-4" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Workspace</p>
        <p className="mt-1 text-sm font-medium text-slate-900">Global Revenue Ops</p>
        <p className="mt-2 text-sm text-slate-600">FY 2026 planning with real-time metrics.</p>
      </div>
    </aside>
  )
}
