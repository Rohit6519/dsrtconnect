'use client'

export type AnalyticsView = 'overview' | 'reach' | 'funnel' | 'sources' | 'outcomes'

const ITEMS: { key: AnalyticsView; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'reach', label: 'Reach' },
  { key: 'funnel', label: 'Funnel' },
  { key: 'sources', label: 'Sources' },
  { key: 'outcomes', label: 'Outcomes' },
]

export function AnalyticsSubNav({
  active, onChange,
}: {
  active: AnalyticsView
  onChange: (v: AnalyticsView) => void
}) {
  return (
    <div className="border-b border-zinc-800/80">
      <div className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
        {ITEMS.map(it => {
          const isActive = active === it.key
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              className={
                'relative py-3 px-4 text-[13px] font-semibold whitespace-nowrap transition-colors ' +
                (isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-200')
              }
            >
              {it.label}
              {isActive && <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-white" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}