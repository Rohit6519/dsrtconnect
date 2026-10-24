'use client'

interface Chip {
  key: string
  label: string
}

interface Props {
  chips: Chip[]
  active: string
  onChange: (key: string) => void
}

export function FilterChips({ chips, active, onChange }: Props) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
      {chips.map(({ key, label }) => {
        const isActive = active === key
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={
              'inline-flex items-center h-8 px-3 rounded-md text-[12.5px] font-medium transition-colors shrink-0 border ' +
              (isActive
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700')
            }
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
