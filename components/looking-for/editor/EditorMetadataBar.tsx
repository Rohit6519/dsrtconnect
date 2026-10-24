'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  Gear, X, MagnifyingGlass, Check,
} from '@phosphor-icons/react'
import type { DraftState } from './useDraftEditor'
import { REQUEST_TYPE_LABELS, COMMITMENT_LABELS, WORK_MODE_LABELS } from '@/types/teamup'

interface Props {
  draft: DraftState
  onChange: (patch: Partial<DraftState>) => void
  onOpenAdvanced: () => void
}

const REQUEST_TYPES = [
  { key: 'hiring',       label: 'Hire someone' },
  { key: 'jobs',         label: 'Post a job' },
  { key: 'collaborate',  label: 'Find a collaborator' },
  { key: 'cofounder',    label: 'Find a co-founder' },
  { key: 'join_project', label: 'Recruit to my project' },
  { key: 'join_venture', label: 'Grow my venture' },
  { key: 'advisor',      label: 'Find an advisor' },
  { key: 'mentor',       label: 'Find a mentor' },
  { key: 'expert_help',  label: 'Get expert help' },
  { key: 'research',     label: 'Research partner' },
  { key: 'volunteer',    label: 'Volunteer opportunity' },
  { key: 'other',        label: 'Something else' },
]

const ROLE_CATEGORIES = [
  'Development', 'Design', 'Product', 'Marketing', 'Sales',
  'Operations', 'Research', 'Data', 'Engineering', 'Business',
  'Content', 'Strategy', 'Other',
]

const EMPLOYMENT_TYPES = [
  { key: 'full-time', label: 'Full-time' },
  { key: 'part-time', label: 'Part-time' },
  { key: 'contract',  label: 'Contract' },
  { key: 'freelance', label: 'Freelance' },
  { key: 'volunteer', label: 'Volunteer' },
  { key: 'flexible',  label: 'Flexible' },
]

const EXPERIENCE = [
  { key: 'student',      label: 'Student' },
  { key: 'beginner',     label: 'Junior' },
  { key: 'intermediate', label: 'Mid-level' },
  { key: 'advanced',     label: 'Senior' },
  { key: 'expert',       label: 'Expert' },
  { key: 'founder',      label: 'Founder' },
]

export function EditorMetadataBar({ draft, onChange, onOpenAdvanced }: Props) {
  return (
    <div className="border-t border-zinc-800 bg-zinc-950/60 backdrop-blur">
      <div className="px-6 py-3.5">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-start">
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
            <Select value={draft.work_mode || ''} onChange={(v) => onChange({ work_mode: v || null })} options={Object.entries(WORK_MODE_LABELS).map(([k, l]) => ({ value: k, label: l }))} placeholder="Select..." />
          </MetaField>
          <MetaField label="Location">
            <input
              type="text"
              value={draft.location || ''}
              onChange={(e) => onChange({ location: e.target.value || null })}
              placeholder="e.g. Remote, US, EU"
              className="w-full h-8 px-2.5 rounded-md bg-zinc-950 border border-zinc-800 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
            />
          </MetaField>
          <MetaField label="Experience">
            <Select value={draft.experience_level || ''} onChange={(v) => onChange({ experience_level: v || null })} options={EXPERIENCE.map(e => ({ value: e.key, label: e.label }))} placeholder="Select..." />
          </MetaField>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 mt-3.5 items-start">
          <MetaField label="Top skills">
            <SkillPicker
              skills={draft.required_skills}
              onChange={(v) => onChange({ required_skills: v })}
            />
          </MetaField>
          <div className="lg:pt-5">
            <button
              onClick={onOpenAdvanced}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-zinc-800 hover:border-zinc-600 text-[12px] text-zinc-300 whitespace-nowrap"
            >
              <Gear size={12} weight="regular" />
              Advanced settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-1.5">
        {label}
      </div>
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
      className="w-full h-8 px-2.5 rounded-md bg-zinc-950 border border-zinc-800 text-[12px] text-zinc-200 focus:outline-none focus:border-zinc-700 cursor-pointer appearance-none"
    >
      <option value="" disabled={!!placeholder}>{placeholder || 'Select...'}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function SkillPicker({
  skills, onChange,
}: {
  skills: string[]
  onChange: (v: string[]) => void
}) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string }>>([])
  const [showSuggest, setShowSuggest] = useState(false)

  useEffect(() => {
    if (!input || input.length < 1) {
      setSuggestions([])
      return
    }
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/looking-for/search/suggestions?field=skills&q=${encodeURIComponent(input)}&limit=8`)
        const data = await res.json()
        if (!cancelled) setSuggestions(data.suggestions || [])
      } catch { /* ignore */ }
    }, 150)
    return () => { cancelled = true; clearTimeout(t) }
  }, [input])

  const add = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || skills.includes(trimmed)) return
    onChange([...skills, trimmed])
    setInput('')
    setShowSuggest(false)
  }

  const remove = (name: string) => onChange(skills.filter(s => s !== name))

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 min-h-[32px] px-2.5 py-1 rounded-md bg-zinc-950 border border-zinc-800 focus-within:border-zinc-700">
        {skills.map(s => (
          <span
            key={s}
            className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-200"
          >
            {s}
            <button
              type="button"
              onClick={() => remove(s)}
              className="w-4 h-4 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
            >
              <X size={9} weight="bold" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggest(true) }}
          onFocus={() => setShowSuggest(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (input.trim()) add(input.trim())
            }
          }}
          placeholder={skills.length === 0 ? '+ Add skill' : ''}
          className="flex-1 min-w-[80px] h-6 bg-transparent text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
        />
      </div>
      {showSuggest && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border border-zinc-800 bg-[#0a0a0a] shadow-xl z-20">
          {suggestions.map(s => {
            const isSelected = skills.includes(s.name)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => !isSelected && add(s.name)}
                disabled={isSelected}
                className={
                  'w-full flex items-center justify-between gap-2 px-3 py-1.5 text-[12px] transition-colors ' +
                  (isSelected
                    ? 'text-zinc-600 cursor-default'
                    : 'text-zinc-200 hover:bg-zinc-900 hover:text-white')
                }
              >
                <span>{s.name}</span>
                {isSelected && <Check size={11} weight="bold" className="text-emerald-400" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
