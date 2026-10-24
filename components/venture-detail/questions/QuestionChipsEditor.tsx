'use client'

interface Props {
  value: string[]
  options: { value: string; label: string }[]
  onSave: (v: string[]) => void | Promise<void>
  disabled?: boolean
}

export function QuestionChipsEditor({ value, options, onSave, disabled = false }: Props) {
  const toggle = (v: string) => {
    if (disabled) return
    const next = value.includes(v)
      ? value.filter(x => x !== v)
      : [...value, v]
    onSave(next)
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const active = value.includes(o.value)
        return (
          <button
            key={o.value}
            onClick={() => toggle(o.value)}
            disabled={disabled}
            className={
              'text-[12px] font-medium px-3 h-8 rounded-md transition-colors ' +
              (active
                ? 'bg-white text-black'
                : 'bg-white/[0.03] border border-white/[0.08] text-white/60 ' +
                  (disabled ? 'cursor-default' : 'hover:text-white hover:border-white/[0.18]'))
            }
          >
            {o.label}
          </button>
        )
      })}
      {disabled && value.length === 0 && (
        <p className="text-[12px] text-white/35 italic py-2">Not answered yet</p>
      )}
    </div>
  )
}