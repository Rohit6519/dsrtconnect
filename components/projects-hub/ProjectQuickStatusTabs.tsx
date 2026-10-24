'use client'

export type QuickStatus = 'all' | 'active' | 'completed' | 'archived'

interface Props {
  active: QuickStatus
  counts: Record<QuickStatus, number>
  onChange: (s: QuickStatus) => void
}

const TABS: { id: QuickStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'archived', label: 'Archived' },
]

export function ProjectQuickStatusTabs({ active, counts, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 p-1 bg-[#0d0d10] border border-white/[0.06] rounded-lg w-fit">
      {TABS.map(tab => {
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors flex items-center gap-1.5 ${
              isActive
                ? 'bg-white/[0.08] text-white'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {tab.label}
            {counts[tab.id] > 0 && (
              <span className={`text-[10px] font-mono ${isActive ? 'text-zinc-300' : 'text-zinc-600'}`}>
                {counts[tab.id]}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}