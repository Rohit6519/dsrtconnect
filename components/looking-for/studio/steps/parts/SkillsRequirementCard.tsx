'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MagnifyingGlass,
  X,
  PlusCircle,
  CircleNotch,
} from '@phosphor-icons/react'
import { useStudio } from '../../StudioContext'
import { InfoTooltip } from './InfoTooltip'

type Priority = 'required' | 'preferred' | 'optional'

const PRIORITY_META: Record<
  Priority,
  { label: string; badge: string; hint: string }
> = {
  required: {
    label: 'Required',
    badge: 'border-red-500/25 bg-red-500/[0.08] text-red-300',
    hint: 'Applicant must have this skill.',
  },
  preferred: {
    label: 'Preferred',
    badge: 'border-amber-500/25 bg-amber-500/[0.08] text-amber-300',
    hint: 'Strong plus but not blocking.',
  },
  optional: {
    label: 'Optional',
    badge: 'border-zinc-700 bg-zinc-900 text-zinc-400',
    hint: 'Nice to know about.',
  },
}

export function SkillsRequirementCard() {
  const { draft, setDraft } = useStudio()
  const oppId = draft.opportunity.id
  const skills = draft.skill_requirements || []

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showDropdown) return
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [showDropdown])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/skills/search?q=${encodeURIComponent(query.trim())}`
        )
        const d = await res.json()
        setSuggestions(d.skills || [])
      } catch {
        setSuggestions([])
      }
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const existingSkillNames = new Set(
    skills.map((s: any) => s.skill_name.toLowerCase())
  )

  const addSkill = useCallback(
    async (
      skillName: string,
      skillId: string | null = null,
      priority: Priority = 'required'
    ) => {
      if (
        !skillName.trim() ||
        existingSkillNames.has(skillName.trim().toLowerCase())
      ) {
        setQuery('')
        setShowDropdown(false)
        return
      }
      setBusy('add:' + skillName)
      try {
        const res = await fetch(`/api/opportunities/drafts/${oppId}/skills`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skill_name: skillName.trim(),
            skill_id: skillId,
            priority,
          }),
        })
        const d = await res.json()
        if (!res.ok) throw new Error(d?.error || 'Failed')
        setDraft((prev) =>
          prev
            ? {
                ...prev,
                skill_requirements: [
                  ...(prev.skill_requirements || []),
                  d.skill_requirement,
                ],
              }
            : prev
        )
        setQuery('')
        setSuggestions([])
        setShowDropdown(false)
      } catch (e: any) {
        alert(e?.message || 'Failed to add skill')
      } finally {
        setBusy(null)
      }
    },
    [oppId, existingSkillNames, setDraft]
  )

  const updatePriority = useCallback(
    async (id: string, priority: Priority) => {
      setBusy(id)
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              skill_requirements: prev.skill_requirements.map((s: any) =>
                s.id === id ? { ...s, priority } : s
              ),
            }
          : prev
      )
      try {
        await fetch(`/api/opportunities/drafts/${oppId}/skills`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skill_req_id: id, priority }),
        })
      } finally {
        setBusy(null)
      }
    },
    [oppId, setDraft]
  )

  const removeSkill = useCallback(
    async (id: string) => {
      setBusy(id)
      const prev = skills
      setDraft((p) =>
        p
          ? {
              ...p,
              skill_requirements: p.skill_requirements.filter(
                (s: any) => s.id !== id
              ),
            }
          : p
      )
      try {
        await fetch(
          `/api/opportunities/drafts/${oppId}/skills?skill_req_id=${id}`,
          { method: 'DELETE' }
        )
      } catch {
        setDraft((p) => (p ? { ...p, skill_requirements: prev } : p))
      } finally {
        setBusy(null)
      }
    },
    [oppId, skills, setDraft]
  )

  const canShowAddCustom =
    query.trim().length > 0 &&
    !suggestions.some(
      (s) => s.name.toLowerCase() === query.trim().toLowerCase()
    )

  const grouped: Record<Priority, any[]> = {
    required: [],
    preferred: [],
    optional: [],
  }
  for (const s of skills) {
    grouped[(s.priority || 'required') as Priority].push(s)
  }

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <label className="flex items-center gap-1.5 text-[13px] font-bold text-white mb-1">
        Skills
        <InfoTooltip text="Select the exact technical or soft skills needed. Categorizing them as required or optional feeds the recommendation engine directly." />
        <span className="text-[10px] text-blue-400 uppercase tracking-wider bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 font-semibold">
          Required
        </span>
      </label>
      <p className="text-[11.5px] text-zinc-500 mb-4">
        Add all skills. Mark each as required, preferred, or optional.
      </p>

      <div className="relative" ref={boxRef}>
        <div className="relative">
          <MagnifyingGlass
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                e.preventDefault()
                addSkill(query.trim())
              }
            }}
            placeholder="Type a skill (e.g. Python) and press Enter…"
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-zinc-600 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-colors"
          />
        </div>

        {showDropdown && (query.trim() || suggestions.length > 0) && (
          <div className="absolute left-0 top-full mt-2 w-full max-h-[280px] overflow-y-auto rounded-xl border border-zinc-800 bg-[#0c0c0e] shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-30 py-1">
            {suggestions.map((s) => {
              const already = existingSkillNames.has(s.name.toLowerCase())
              return (
                <button
                  key={s.id}
                  onClick={() => !already && addSkill(s.name, s.id)}
                  disabled={already}
                  className={
                    'w-full flex items-center justify-between px-3 py-2 text-left transition-colors ' +
                    (already
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-zinc-900')
                  }
                >
                  <span className="text-[12.5px] font-medium text-zinc-200">
                    {s.name}
                  </span>
                  {already ? (
                    <span className="text-[10.5px] text-zinc-500">Added</span>
                  ) : (
                    <PlusCircle size={12} className="text-zinc-500" />
                  )}
                </button>
              )
            })}
            {canShowAddCustom && (
              <button
                onClick={() => addSkill(query.trim())}
                className="w-full flex items-center gap-2 px-3 py-2.5 border-t border-zinc-800 text-left hover:bg-zinc-900 transition-colors"
              >
                {busy?.startsWith('add:') ? (
                  <CircleNotch size={12} className="text-zinc-500 animate-spin" />
                ) : (
                  <PlusCircle
                    size={12}
                    className="text-emerald-400"
                    weight="fill"
                  />
                )}
                <span className="text-[12px] text-zinc-300">
                  Add custom skill:{' '}
                  <span className="text-white font-semibold">
                    {query.trim()}
                  </span>
                </span>
              </button>
            )}
            {suggestions.length === 0 && !canShowAddCustom && (
              <div className="px-3 py-3 text-[12px] text-zinc-500 text-center">
                Start typing to search skills…
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 space-y-4">
        {(['required', 'preferred', 'optional'] as Priority[]).map((p) => {
          const list = grouped[p]
          if (list.length === 0 && p === 'optional') return null
          return (
            <div key={p}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={
                    'inline-flex items-center h-5 px-1.5 rounded text-[10.5px] font-bold uppercase tracking-wider border ' +
                    PRIORITY_META[p].badge
                  }
                >
                  {PRIORITY_META[p].label}
                </span>
                <span className="text-[10.5px] text-zinc-500">
                  {PRIORITY_META[p].hint}
                </span>
              </div>
              {list.length === 0 ? (
                <div className="text-[12px] text-zinc-500 italic px-3 py-2 rounded-lg border border-dashed border-zinc-800/70 bg-zinc-950/30">
                  No {p} skills yet.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {list.map((s: any) => (
                    <SkillChip
                      key={s.id}
                      skill={s}
                      busy={busy === s.id}
                      onChangePriority={(np) => updatePriority(s.id, np)}
                      onRemove={() => removeSkill(s.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SkillChip({
  skill,
  busy,
  onChangePriority,
  onRemove,
}: {
  skill: any
  busy: boolean
  onChangePriority: (p: Priority) => void
  onRemove: () => void
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

  return (
    <div className="relative" ref={ref}>
      <div
        className={
          'inline-flex items-center gap-1.5 h-8 pl-3 pr-1 rounded-lg border border-zinc-800 bg-zinc-950 ' +
          (busy ? 'opacity-50' : '')
        }
      >
        <button
          onClick={() => setOpen(!open)}
          className="text-[12.5px] font-semibold text-zinc-100 hover:text-white"
        >
          {skill.skill_name}
        </button>
        <button
          onClick={onRemove}
          disabled={busy}
          className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-red-300 hover:bg-red-500/10"
          aria-label={`Remove ${skill.skill_name}`}
        >
          <X size={10} weight="bold" />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-40 rounded-xl border border-zinc-800 bg-[#0c0c0e] shadow-2xl z-20 py-1">
          {(['required', 'preferred', 'optional'] as Priority[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                onChangePriority(p)
                setOpen(false)
              }}
              className={
                'w-full text-left px-3 py-1.5 text-[12px] ' +
                (skill.priority === p
                  ? 'bg-zinc-900 text-white font-semibold'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900')
              }
            >
              {PRIORITY_META[p].label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}