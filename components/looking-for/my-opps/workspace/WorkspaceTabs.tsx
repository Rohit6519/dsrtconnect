'use client'

export type WorkspaceTab =
  | 'overview'
  | 'applicants'
  | 'pipeline'
  | 'messages'
  | 'performance'
  | 'distribution'
  | 'activity'
  | 'automation'
  | 'compliance'
  | 'settings'

const ITEMS: { key: WorkspaceTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'applicants', label: 'Applicants' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'messages', label: 'Messages' },
  { key: 'performance', label: 'Performance' },
  { key: 'distribution', label: 'Distribution' },
  { key: 'activity', label: 'Activity' },
  { key: 'automation', label: 'Automation' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'settings', label: 'Settings' },
]

export function WorkspaceTabs({ active, onChange }: { active: WorkspaceTab; onChange: (t: WorkspaceTab) => void }) {
  return (
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
  )
}