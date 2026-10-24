'use client'

export type EditorTab = 'opportunity' | 'poster' | 'settings'

interface Props {
  active: EditorTab
  onChange: (t: EditorTab) => void
}

const TABS: { id: EditorTab; label: string }[] = [
  { id: 'opportunity', label: 'Opportunity' },
  { id: 'poster', label: 'Poster' },
  { id: 'settings', label: 'Advanced Settings' },
]

export function EditorTabs({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 -mb-px">
      {TABS.map(t => {
        const isActive = active === t.id
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={
              'py-3 px-4 text-[13px] font-semibold whitespace-nowrap transition-colors border-b-2 ' +
              (isActive
                ? 'text-white border-white'
                : 'text-zinc-500 border-transparent hover:text-zinc-200')
            }
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}