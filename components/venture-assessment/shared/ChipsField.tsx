'use client'

interface Option {
  value: string
  label: string
}

interface Props {
  options: Option[]
  value: string[]
  onChange: (next: string[]) => void
  max?: number
}

export function ChipsField({ options, value, onChange, max }: Props) {
  const toggle = (v: string) => {
    if (value.includes(v)) {
      onChange(value.filter(x => x !== v))
    } else {
      if (max && value.length >= max) return
      onChange([...value, v])
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const active = value.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={
              'text-[12px] font-medium px-3 h-8 rounded-md transition-colors ' +
              (active
                ? 'bg-white text-black'
                : 'bg-[#121215] border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600')
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}