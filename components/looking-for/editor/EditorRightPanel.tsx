'use client'

import { useEffect, useRef, useState } from 'react'
import { X, MapPin, Plus } from '@phosphor-icons/react'
import type { DraftState } from './useDraftEditor'
import { WORK_MODE_LABELS } from '@/types/teamup'
import { SkillsLightbox } from './SkillsLightbox'

interface Props {
  draft: DraftState
  onChange: (patch: Partial<DraftState>) => void
}

const REQUEST_TYPES = [
  { key: 'hiring', label: 'Hire someone' },
  { key: 'jobs', label: 'Post a job' },
  { key: 'collaborate', label: 'Find a collaborator' },
  { key: 'cofounder', label: 'Find a co-founder' },
  { key: 'join_project', label: 'Recruit to my project' },
  { key: 'join_venture', label: 'Grow my venture' },
  { key: 'advisor', label: 'Find an advisor' },
  { key: 'mentor', label: 'Find a mentor' },
  { key: 'expert_help', label: 'Get expert help' },
  { key: 'research', label: 'Research partner' },
  { key: 'volunteer', label: 'Volunteer opportunity' },
  { key: 'other', label: 'Something else' },
]

const ROLE_CATEGORIES = [
  'Development', 'Design', 'Product', 'Marketing', 'Sales',
  'Operations', 'Research', 'Data', 'Engineering', 'Business',
  'Content', 'Strategy', 'Other',
]

const EMPLOYMENT_TYPES = [
  { key: 'full-time', label: 'Full-time' },
  { key: 'part-time', label: 'Part-time' },
  { key: 'contract', label: 'Contract' },
  { key: 'freelance', label: 'Freelance' },
  { key: 'volunteer', label: 'Volunteer' },
  { key: 'flexible', label: 'Flexible' },
]

const EXPERIENCE = [
  { key: 'student', label: 'Student' },
  { key: 'beginner', label: 'Junior' },
  { key: 'intermediate', label: 'Mid-level' },
  { key: 'advanced', label: 'Senior' },
  { key: 'expert', label: 'Expert' },
  { key: 'founder', label: 'Founder' },
]

export function EditorRightPanel({ draft, onChange }: Props) {
  const [showSkillsLightbox, setShowSkillsLightbox] = useState(false)

  return (
    <>
      <div className="divide-y divide-zinc-800">
        <MetaField label="What are you looking for?">
          <Select value={draft.request_type || ''} onChange={(v) => onChange({ request_type: v || null })} options={REQUEST_TYPES.map(t => ({ value: t.key, label: t.label }))} placeholder="Select..." />
        </MetaField>

        <MetaField label="Role category">
          <Select value={draft.role_category || ''} onChange={(v) => onChange({ role_category: v || null })} options={ROLE_CATEGORIES.map(c => ({ value: c, label: c }))} placeholder="Select..." />
        </MetaField>

        <MetaField label="Employment type">
          <Select value={draft.employment_type || ''} onChange={(v) => onChange({ employment_type: v || null })} options={EMPLOYMENT_TYPES.map(t => ({ value: t.key, label: t.label }))} placeholder="Select..." />
        </MetaField>

        <MetaField label="Work mode">
          <Select value={draft.work_mode || ''} onChange={(v) => onChange({ work_mode: v || null })} options={Object.entries(WORK_MODE_LABELS).map(([k, l]) => ({ value: k, label: l }))} placeholder="Remote" />
        </MetaField>

        <MetaField label="Location">
          <LocationAutocomplete
            value={draft.location || ''}
            onChange={(v) => onChange({ location: v || null })}
          />
        </MetaField>

        <MetaField label="Experience">
          <Select value={draft.experience_level || ''} onChange={(v) => onChange({ experience_level: v || null })} options={EXPERIENCE.map(e => ({ value: e.key, label: e.label }))} placeholder="Select..." />
        </MetaField>

        <MetaField label="Top skills">
          <SkillsSummary
            skills={draft.required_skills}
            onOpen={() => setShowSkillsLightbox(true)}
            onRemove={(s) => onChange({ required_skills: draft.required_skills.filter(x => x !== s) })}
          />
        </MetaField>
      </div>

      {showSkillsLightbox && (
        <SkillsLightbox
          initialSkills={draft.required_skills}
          onSave={(skills) => onChange({ required_skills: skills })}
          onClose={() => setShowSkillsLightbox(false)}
        />
      )}
    </>
  )
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-4 first:pt-1 last:pb-1">
      <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400 mb-2">
        {label}
      </label>
      {children}
    </div>
  )
}

function Select({
  value, onChange, options, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 px-3 rounded-md bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-[13.5px] text-zinc-100 focus:outline-none focus:border-zinc-600 cursor-pointer appearance-none transition-colors"
      style={{
        backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        paddingRight: '32px',
      }}
    >
      <option value="" disabled={!!placeholder}>{placeholder || 'Select...'}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function LocationAutocomplete({
  value, onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [input, setInput] = useState(value)
  const [suggestions, setSuggestions] = useState<Array<{ label: string }>>([])
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => setInput(value), [value])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/looking-for/locations?q=${encodeURIComponent(input)}&limit=12`)
        const data = await res.json()
        if (!cancelled) setSuggestions(data.suggestions || [])
      } catch { /* ignore */ }
    }, 150)
    return () => { cancelled = true; clearTimeout(t) }
  }, [input, open])

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', h)
    return () => window.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => onChange(input), 200)}
          placeholder="e.g. Remote, San Francisco, Bangalore..."
          className="w-full h-10 pl-9 pr-3 rounded-md bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-950 shadow-xl z-20">
          {suggestions.map((s, i) => (
            <button
              key={s.label + i}
              type="button"
              onClick={() => {
                setInput(s.label)
                onChange(s.label)
                setOpen(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] text-zinc-200 hover:bg-zinc-900 hover:text-white"
            >
              <MapPin size={11} className="text-zinc-500 shrink-0" />
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SkillsSummary({
  skills, onOpen, onRemove,
}: {
  skills: string[]
  onOpen: () => void
  onRemove: (s: string) => void
}) {
  if (skills.length === 0) {
    return (
      <button
        onClick={onOpen}
        className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-md border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 hover:text-white text-[13px] font-semibold transition-colors"
      >
        <Plus size={12} weight="bold" />
        Add skills
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[40px] px-2.5 py-2 rounded-md bg-zinc-950 border border-zinc-800">
        {skills.map(s => (
          <span
            key={s}
            className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded bg-zinc-900 border border-zinc-800 text-[11.5px] text-zinc-100"
          >
            {s}
            <button
              onClick={() => onRemove(s)}
              className="w-4 h-4 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
            >
              <X size={9} weight="bold" />
            </button>
          </span>
        ))}
      </div>
      <button
        onClick={onOpen}
        className="w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-md border border-zinc-800 hover:border-zinc-600 bg-zinc-950 hover:bg-zinc-900 text-[12px] font-semibold text-zinc-300 hover:text-white transition-colors"
      >
        Browse all skills ({skills.length})
      </button>
    </div>
  )
}
