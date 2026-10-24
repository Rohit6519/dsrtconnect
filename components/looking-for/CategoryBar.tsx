'use client'

interface CategoryTab {
  key: string
  label: string
}

const CATEGORIES: CategoryTab[] = [
  { key: 'all',              label: 'All' },
  { key: 'hiring',           label: 'Hiring' },
  { key: 'jobs',             label: 'Jobs' },
  { key: 'collaborate',      label: 'Collaborate' },
  { key: 'join_project',     label: 'Join a Project' },
  { key: 'join_venture',     label: 'Join a Venture' },
  { key: 'cofounder',        label: 'Co-founder' },
  { key: 'expert_help',      label: 'Expertise' },
  { key: 'research',         label: 'Research' },
  { key: 'advisor',          label: 'Advisors' },
  { key: 'mentor',           label: 'Mentors' },
  { key: 'volunteer',        label: 'Volunteer' },
  { key: 'other',            label: 'Other' },
]

interface Props {
  active: string
  onChange: (key: string) => void
}

export function CategoryBar({ active, onChange }: Props) {
  return (
    <nav
      aria-label="Opportunity categories"
      className="relative border-b border-zinc-800"
    >
      <div className="flex items-center gap-7 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map(({ key, label }) => {
          const isActive = active === key
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              aria-current={isActive ? 'page' : undefined}
              className={
                'relative py-3.5 text-[14px] font-semibold tracking-tight whitespace-nowrap shrink-0 transition-colors focus:outline-none ' +
                (isActive
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-200')
              }
            >
              {label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white rounded-full" />
              )}
            </button>
          )
        })}
      </div>
      <div className="md:hidden absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0a0a0a] to-transparent pointer-events-none" />
    </nav>
  )
}

export { CATEGORIES }
