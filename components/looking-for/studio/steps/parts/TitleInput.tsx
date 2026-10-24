'use client'

import { useState, useRef, useEffect } from 'react'

const COMMON_TITLES = [
  "Software Engineer", "Frontend Developer", "Backend Engineer", "Full Stack Developer",
  "Machine Learning Engineer", "Data Scientist", "Data Engineer", "AI Researcher",
  "Product Manager", "Project Manager", "Scrum Master",
  "UI/UX Designer", "Product Designer", "Graphic Designer", "3D Artist",
  "Technical Co-founder", "Business Co-founder", "Marketing Co-founder",
  "DevOps Engineer", "Cloud Architect", "Security Engineer",
  "Developer Advocate", "Technical Writer", "Community Manager",
  "Marketing Manager", "Growth Hacker", "Sales Executive",
  "Intern", "Research Assistant", "Open Source Contributor"
]

export function TitleInput({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (v: string) => void 
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])

  const filtered = COMMON_TITLES.filter(t => 
    t.toLowerCase().includes(value.toLowerCase()) && t.toLowerCase() !== value.toLowerCase()
  ).slice(0, 6)

  return (
    <div className="relative w-full" ref={ref}>
      <input
        value={value === 'Untitled opportunity' ? '' : value}
        onChange={(e) => {
          onChange(e.target.value.slice(0, 100))
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="e.g. Senior Machine Learning Engineer"
        className="w-full h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[14px] font-semibold text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.5px] text-zinc-600 font-mono pointer-events-none">
        {value?.length > 0 && value !== 'Untitled opportunity' ? value.length : 0}/100
      </span>

      {open && filtered.length > 0 && (
        <div className="absolute left-0 top-full mt-2 w-full rounded-xl border border-zinc-800 bg-[#0c0c0e] shadow-2xl z-40 py-1 max-h-[240px] overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Suggestions</div>
          {filtered.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => {
                onChange(t)
                setOpen(false)
              }}
              className="w-full text-left px-3 py-2.5 text-[13px] font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}