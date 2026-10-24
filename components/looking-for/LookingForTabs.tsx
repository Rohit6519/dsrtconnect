'use client'

export type TeamUpTab =
  | 'explore' | 'my-hirings' | 'suggested'
  | 'saved' | 'applications' | 'activity' | 'settings'

interface Tab {
  key: TeamUpTab
  label: string
}

const TABS: Tab[] = [
  { key: 'explore', label: 'Explore' },
  { key: 'my-hirings', label: 'My Hirings' },
  { key: 'suggested', label: 'Suggested' },
  { key: 'saved', label: 'Saved' },
  { key: 'applications', label: 'Applications' },
  { key: 'activity', label: 'Activity' },
  { key: 'settings', label: 'Settings' },
]

interface Props {
  active: TeamUpTab
  onChange: (tab: TeamUpTab) => void
}

export function LookingForTabs({ active, onChange }: Props) {
  return (
    <nav aria-label="Team Up sections" className="relative border-b border-zinc-800">
      <div role="tablist" className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {TABS.map(({ key, label }) => {
          const isActive = active === key
          return (
            <button
              key={key}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(key)}
              className={
                'relative px-4 py-3 text-[14px] font-semibold tracking-tight transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 rounded ' +
                (isActive
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-200')
              }
            >
              {label}
              {isActive && (
                <span className="absolute bottom-0 left-4 right-4 h-[2.5px] bg-white rounded-full" />
              )}
            </button>
          )
        })}
      </div>
      <div className="md:hidden absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0a0a0a] to-transparent pointer-events-none" />
    </nav>
  )
}
