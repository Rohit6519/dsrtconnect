'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Plus, Trash, MagnifyingGlass, Check, CircleNotch, Warning,
} from '@phosphor-icons/react'
import type { DraftState, CustomQuestion, ApplicationConfig } from './useDraftEditor'

interface Props {
  draft: DraftState
  onChange: (patch: Partial<DraftState>) => void
}

type Section = 'application' | 'questions' | 'hiring_team' | 'visibility' | 'deadline'

const SECTIONS: Array<{ key: Section; label: string; description: string }> = [
  { key: 'application', label: 'Application',   description: 'What applicants must provide' },
  { key: 'questions',   label: 'Questions',     description: 'Custom questions for applicants' },
  { key: 'hiring_team', label: 'Hiring team',   description: 'People who can review applications' },
  { key: 'visibility',  label: 'Visibility',    description: 'Who can see and apply' },
  { key: 'deadline',    label: 'Deadline',      description: 'When applications close' },
]

export function AdvancedSettingsPage({ draft, onChange }: Props) {
  const [section, setSection] = useState<Section>('application')
  const cfg = draft.application_config

  const updateCfg = (patch: Partial<ApplicationConfig>) => {
    onChange({ application_config: { ...cfg, ...patch } })
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] gap-8">
        {/* Left rail */}
        <aside className="md:sticky md:top-[130px] h-fit">
          <nav aria-label="Settings sections">
            <ul className="space-y-0.5">
              {SECTIONS.map(s => {
                const active = section === s.key
                const count = s.key === 'questions' ? draft.custom_questions.length : null
                return (
                  <li key={s.key}>
                    <button
                      onClick={() => setSection(s.key)}
                      className={
                        'w-full text-left px-3 py-2 rounded-md text-[13.5px] font-medium transition-colors ' +
                        (active
                          ? 'bg-zinc-900 text-white border-l-2 border-white -ml-0.5 pl-[10px]'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border-l-2 border-transparent -ml-0.5 pl-[10px]')
                      }
                    >
                      <div className="flex items-center justify-between">
                        <span>{s.label}</span>
                        {count !== null && count > 0 && (
                          <span className="text-[10.5px] text-zinc-500 font-semibold">{count}</span>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0">
          <div className="mb-6">
            <h2 className="text-[22px] font-bold text-white tracking-tight">
              {SECTIONS.find(s => s.key === section)?.label}
            </h2>
            <p className="text-[13px] text-zinc-500 mt-1">
              {SECTIONS.find(s => s.key === section)?.description}
            </p>
          </div>

          {section === 'application' && <ApplicationPane config={cfg} onChange={updateCfg} />}
          {section === 'questions' && (
            <QuestionsPane
              questions={draft.custom_questions}
              onChange={(qs) => onChange({ custom_questions: qs })}
            />
          )}
          {section === 'hiring_team' && <HiringTeamPane requestId={draft.id} />}
          {section === 'visibility' && <VisibilityPane config={cfg} onChange={updateCfg} />}
          {section === 'deadline' && <DeadlinePane config={cfg} onChange={updateCfg} />}
        </main>
      </div>
    </div>
  )
}

// ============================================================
// APPLICATION SECTION
// ============================================================
function ApplicationPane({
  config, onChange,
}: {
  config: ApplicationConfig
  onChange: (patch: Partial<ApplicationConfig>) => void
}) {
  const items = [
    { key: 'require_dsrt_profile',       label: 'DSRT profile',        description: 'Applicants use their DSRT profile as their identity' },
    { key: 'require_short_intro',        label: 'Short introduction',  description: 'A brief message about themselves and why they\'re applying' },
    { key: 'require_relevant_experience', label: 'Relevant experience', description: 'Longer form response about their fit' },
    { key: 'require_cover_letter',       label: 'Cover letter',        description: 'Formal written cover letter' },
    { key: 'require_resume',             label: 'Resume',              description: 'Uploaded CV or resume URL' },
    { key: 'require_portfolio',          label: 'Portfolio',           description: 'Link to portfolio or previous work' },
    { key: 'require_github',             label: 'GitHub',              description: 'GitHub profile URL' },
    { key: 'require_website',            label: 'Website',             description: 'Personal website or blog' },
  ]

  return (
    <div className="space-y-4">
      <Card>
        <div className="border-b border-zinc-800 px-5 py-3.5">
          <div className="text-[13px] font-bold text-white">Application materials</div>
          <div className="text-[12px] text-zinc-500 mt-0.5">Only ask for what you'll actually review.</div>
        </div>
        <div className="divide-y divide-zinc-800">
          {items.map(i => (
            <ToggleRow
              key={i.key}
              label={i.label}
              description={i.description}
              checked={(config as any)[i.key]}
              onChange={(v) => onChange({ [i.key]: v } as any)}
            />
          ))}
        </div>
      </Card>

      <Card>
        <div className="border-b border-zinc-800 px-5 py-3.5">
          <div className="text-[13px] font-bold text-white">Accepting applications</div>
        </div>
        <ToggleRow
          label={config.applications_open ? 'Accepting applications' : 'Applications paused'}
          description="Turn off to keep the opportunity visible but stop accepting new applications."
          checked={config.applications_open}
          onChange={(v) => onChange({ applications_open: v })}
        />
      </Card>
    </div>
  )
}

// ============================================================
// QUESTIONS SECTION
// ============================================================
function QuestionsPane({
  questions, onChange,
}: {
  questions: CustomQuestion[]
  onChange: (qs: CustomQuestion[]) => void
}) {
  const addQuestion = () => {
    onChange([...questions, {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      question: '',
      type: 'short_answer',
      required: false,
    }])
  }

  const updateQ = (id: string, patch: Partial<CustomQuestion>) => {
    onChange(questions.map(q => q.id === id ? { ...q, ...patch } : q))
  }

  const removeQ = (id: string) => onChange(questions.filter(q => q.id !== id))

  const moveUp = (i: number) => {
    if (i === 0) return
    const next = [...questions]
    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
    onChange(next)
  }

  const moveDown = (i: number) => {
    if (i === questions.length - 1) return
    const next = [...questions]
    ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-zinc-400">
          {questions.length === 0 ? 'No custom questions yet.' : `${questions.length} question${questions.length !== 1 ? 's' : ''}`}
        </div>
        <button
          onClick={addQuestion}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-zinc-800 hover:border-zinc-600 bg-zinc-950 hover:bg-zinc-900 text-[13px] font-semibold text-zinc-200"
        >
          <Plus size={11} weight="bold" />
          Add question
        </button>
      </div>

      {questions.length === 0 ? (
        <Card>
          <div className="p-8 text-center">
            <div className="text-[13.5px] text-zinc-400 mb-1 font-semibold">No custom questions</div>
            <div className="text-[12.5px] text-zinc-500">
              Applicants will only be asked for the materials you selected.
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {questions.map((q, i) => (
            <QuestionEditor
              key={q.id}
              question={q}
              index={i}
              total={questions.length}
              onUpdate={(patch) => updateQ(q.id, patch)}
              onRemove={() => removeQ(q.id)}
              onMoveUp={() => moveUp(i)}
              onMoveDown={() => moveDown(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function QuestionEditor({
  question, index, total,
  onUpdate, onRemove, onMoveUp, onMoveDown,
}: {
  question: CustomQuestion
  index: number
  total: number
  onUpdate: (patch: Partial<CustomQuestion>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const showOptions = question.type === 'multiple_choice'
  const addOption = () => onUpdate({ options: [...(question.options || []), ''] })
  const updateOption = (i: number, val: string) => {
    const opts = [...(question.options || [])]
    opts[i] = val
    onUpdate({ options: opts })
  }
  const removeOption = (i: number) => {
    onUpdate({ options: (question.options || []).filter((_, idx) => idx !== i) })
  }

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex flex-col items-center gap-0.5 shrink-0 pt-1">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="w-6 h-4 rounded text-zinc-600 hover:text-zinc-200 disabled:opacity-20 text-[10px] font-bold"
            >
              ▲
            </button>
            <div className="text-[11px] font-mono text-zinc-500">{String(index + 1).padStart(2, '0')}</div>
            <button
              onClick={onMoveDown}
              disabled={index === total - 1}
              className="w-6 h-4 rounded text-zinc-600 hover:text-zinc-200 disabled:opacity-20 text-[10px] font-bold"
            >
              ▼
            </button>
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <textarea
              value={question.question}
              onChange={(e) => onUpdate({ question: e.target.value })}
              placeholder="e.g. Tell us about a project you've built with these skills."
              rows={2}
              className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 focus:border-zinc-600 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed"
            />

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={question.type}
                onChange={(e) => onUpdate({ type: e.target.value as CustomQuestion['type'] })}
                className="h-8 px-2.5 rounded bg-zinc-950 border border-zinc-800 text-[12px] text-zinc-100 focus:outline-none focus:border-zinc-600 cursor-pointer"
              >
                <option value="short_answer">Short answer</option>
                <option value="long_answer">Long answer</option>
                <option value="yes_no">Yes / No</option>
                <option value="multiple_choice">Multiple choice</option>
                <option value="number">Number</option>
                <option value="url">URL</option>
              </select>

              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(e) => onUpdate({ required: e.target.checked })}
                  className="w-3.5 h-3.5 accent-white"
                />
                <span className="text-[12px] text-zinc-400 font-medium">Required</span>
              </label>
            </div>

            {showOptions && (
              <div className="pt-2 border-t border-zinc-800 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                  Options
                </div>
                {(question.options || []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 h-8 px-2.5 rounded bg-zinc-950 border border-zinc-800 focus:border-zinc-600 text-[12px] text-zinc-100 focus:outline-none"
                    />
                    <button
                      onClick={() => removeOption(i)}
                      className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <X size={10} weight="bold" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addOption}
                  className="inline-flex items-center gap-1 text-[12px] text-zinc-400 hover:text-white mt-1 font-semibold"
                >
                  <Plus size={9} weight="bold" />
                  Add option
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onRemove}
            className="w-8 h-8 rounded-md flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
          >
            <Trash size={13} />
          </button>
        </div>
      </div>
    </Card>
  )
}

// ============================================================
// VISIBILITY SECTION
// ============================================================
function VisibilityPane({
  config, onChange,
}: {
  config: ApplicationConfig
  onChange: (patch: Partial<ApplicationConfig>) => void
}) {
  const options = [
    { key: 'everyone', label: 'Everyone', description: 'Anyone with a DSRT account can apply' },
    { key: 'members_only', label: 'DSRT members only', description: 'Only signed-in DSRT members' },
    { key: 'verified_only', label: 'Verified builders only', description: 'Only verified builders can apply' },
    { key: 'invite_only', label: 'Invite only', description: 'Only people you specifically invite can apply' },
  ]

  return (
    <Card>
      <div className="border-b border-zinc-800 px-5 py-3.5">
        <div className="text-[13px] font-bold text-white">Who can apply?</div>
      </div>
      <div className="divide-y divide-zinc-800">
        {options.map(o => (
          <RadioRow
            key={o.key}
            label={o.label}
            description={o.description}
            checked={config.visibility === o.key}
            onClick={() => onChange({ visibility: o.key as any })}
          />
        ))}
      </div>
    </Card>
  )
}

// ============================================================
// DEADLINE SECTION
// ============================================================
function DeadlinePane({
  config, onChange,
}: {
  config: ApplicationConfig
  onChange: (patch: Partial<ApplicationConfig>) => void
}) {
  return (
    <Card>
      <div className="border-b border-zinc-800 px-5 py-3.5">
        <div className="text-[13px] font-bold text-white">Application deadline</div>
        <div className="text-[12px] text-zinc-500 mt-0.5">Applications automatically close after this date.</div>
      </div>
      <div className="p-5 flex items-center gap-3">
        <input
          type="date"
          value={config.application_deadline ? config.application_deadline.slice(0, 10) : ''}
          onChange={(e) => onChange({ application_deadline: e.target.value ? new Date(e.target.value).toISOString() : null })}
          className="h-10 px-3 rounded-md bg-zinc-950 border border-zinc-800 focus:border-zinc-600 text-[13.5px] text-zinc-100 focus:outline-none"
        />
        {config.application_deadline && (
          <button
            onClick={() => onChange({ application_deadline: null })}
            className="text-[13px] text-zinc-400 hover:text-white font-semibold"
          >
            Remove deadline
          </button>
        )}
      </div>
    </Card>
  )
}

// ============================================================
// HIRING TEAM SECTION
// ============================================================
interface HiringMember {
  id: string
  user_id: string
  role: string
  user?: {
    id: string
    username: string
    full_name: string
    avatar_url: string | null
    tagline?: string | null
  }
}

interface UserSearchResult {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  tagline: string | null
}

function HiringTeamPane({ requestId }: { requestId: string | null }) {
  const [members, setMembers] = useState<HiringMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  const load = async () => {
    if (!requestId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/looking-for/drafts/${requestId}/hiring-team`)
      const data = await res.json()
      setMembers(data.members || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return }
    let cancelled = false
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/looking-for/search?q=${encodeURIComponent(query)}&scope=people&limit=5`)
        const data = await res.json()
        if (!cancelled) setResults(data.groups?.people || [])
      } catch { /* ignore */ }
      finally { if (!cancelled) setSearching(false) }
    }, 200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query])

  const addMember = async (userId: string, role: string = 'reviewer') => {
    if (!requestId) return
    try {
      const res = await fetch(`/api/looking-for/drafts/${requestId}/hiring-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to add')
      }
      setQuery('')
      setResults([])
      await load()
    } catch (e: any) {
      window.alert(e.message)
    }
  }

  const updateMemberRole = async (memberId: string, role: string) => {
    if (!requestId) return
    try {
      await fetch(`/api/looking-for/drafts/${requestId}/hiring-team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      await load()
    } catch { /* ignore */ }
  }

  const removeMember = async (memberId: string) => {
    if (!requestId) return
    if (!confirm('Remove this member?')) return
    try {
      await fetch(`/api/looking-for/drafts/${requestId}/hiring-team/${memberId}`, { method: 'DELETE' })
      await load()
    } catch { /* ignore */ }
  }

  if (!requestId) {
    return (
      <Card>
        <div className="p-5 flex items-start gap-2.5">
          <Warning size={14} weight="fill" className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[13px] text-zinc-300 leading-relaxed">
            Add a title and save the draft first — then invite team members.
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="border-b border-zinc-800 px-5 py-3.5">
          <div className="text-[13px] font-bold text-white">Add team members</div>
          <div className="text-[12px] text-zinc-500 mt-0.5">Invite people to help you review applications.</div>
        </div>
        <div className="p-5">
          <div className="relative">
            <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search DSRT members by name or username..."
              className="w-full h-10 pl-9 pr-3 rounded-md bg-zinc-950 border border-zinc-800 focus:border-zinc-600 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />
            {(searching || results.length > 0) && query.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-950 shadow-xl z-10">
                {searching ? (
                  <div className="px-3 py-2 text-[12px] text-zinc-500 flex items-center gap-2">
                    <CircleNotch size={11} className="animate-spin" /> Searching...
                  </div>
                ) : results.length === 0 ? (
                  <div className="px-3 py-2 text-[12px] text-zinc-500">No matches</div>
                ) : (
                  results.map(u => {
                    const alreadyAdded = members.some(m => m.user_id === u.id)
                    return (
                      <button
                        key={u.id}
                        onClick={() => !alreadyAdded && addMember(u.id, 'reviewer')}
                        disabled={alreadyAdded}
                        className={
                          'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ' +
                          (alreadyAdded ? 'opacity-40 cursor-default' : 'hover:bg-zinc-900')
                        }
                      >
                        {u.avatar_url ? (
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-800 shrink-0 relative">
                            <Image src={u.avatar_url} alt="" fill className="object-cover" sizes="28px" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[11px] text-zinc-400 shrink-0 font-semibold">
                            {u.full_name?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] text-zinc-100 truncate font-medium">{u.full_name}</div>
                          {u.tagline && <div className="text-[10.5px] text-zinc-500 truncate">{u.tagline}</div>}
                        </div>
                        {alreadyAdded && <Check size={11} weight="bold" className="text-emerald-400 shrink-0" />}
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="border-b border-zinc-800 px-5 py-3.5">
          <div className="text-[13px] font-bold text-white">Team ({members.length})</div>
        </div>
        {loading ? (
          <div className="p-5 text-[12.5px] text-zinc-500 flex items-center gap-2">
            <CircleNotch size={11} className="animate-spin" /> Loading...
          </div>
        ) : members.length === 0 ? (
          <div className="p-5 text-[12.5px] text-zinc-500">
            Just you for now. Add teammates above.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                {m.user?.avatar_url ? (
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 shrink-0 relative">
                    <Image src={m.user.avatar_url} alt="" fill className="object-cover" sizes="36px" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-[13px] text-zinc-400 shrink-0 font-semibold">
                    {m.user?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-zinc-100 truncate">{m.user?.full_name}</div>
                  <div className="text-[11.5px] text-zinc-500 truncate">@{m.user?.username}</div>
                </div>
                <select
                  value={m.role}
                  onChange={(e) => updateMemberRole(m.id, e.target.value)}
                  className="h-8 px-2.5 rounded bg-zinc-950 border border-zinc-800 text-[12px] text-zinc-100 focus:outline-none focus:border-zinc-600 cursor-pointer capitalize font-medium"
                >
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={() => removeMember(m.id)}
                  className="w-8 h-8 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="text-[11.5px] text-zinc-500 leading-relaxed">
        <span className="font-bold text-zinc-400">Owner:</span> full access · <span className="font-bold text-zinc-400">Manager:</span> review, message, accept/reject · <span className="font-bold text-zinc-400">Reviewer:</span> review + message · <span className="font-bold text-zinc-400">Viewer:</span> view only.
      </div>

      {error && <div className="text-[12px] text-red-400">{error}</div>}
    </div>
  )
}

// ============================================================
// SHARED PRIMITIVES
// ============================================================
function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">{children}</div>
}

function ToggleRow({
  label, description, checked, onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3.5">
      <div className="min-w-0">
        <div className="text-[13.5px] font-semibold text-zinc-100">{label}</div>
        <div className="text-[12px] text-zinc-500 mt-0.5 leading-relaxed">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className={
          'relative shrink-0 w-9 rounded-full transition-colors mt-0.5 ' +
          (checked ? 'bg-white' : 'bg-zinc-700')
        }
        style={{ height: 20 }}
      >
        <span className={
          'absolute top-0.5 w-4 h-4 rounded-full shadow transition-all ' +
          (checked ? 'left-[18px] bg-black' : 'left-0.5 bg-white')
        } />
      </button>
    </div>
  )
}

function RadioRow({
  label, description, checked, onClick,
}: {
  label: string
  description: string
  checked: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'w-full text-left px-5 py-3.5 flex items-start gap-3 transition-colors ' +
        (checked ? 'bg-zinc-900/60' : 'hover:bg-zinc-900/40')
      }
    >
      <div className={
        'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ' +
        (checked ? 'border-white' : 'border-zinc-600')
      }>
        {checked && <span className="w-2 h-2 rounded-full bg-white" />}
      </div>
      <div className="min-w-0">
        <div className="text-[13.5px] font-semibold text-zinc-100">{label}</div>
        <div className="text-[12px] text-zinc-500 mt-0.5 leading-relaxed">{description}</div>
      </div>
    </button>
  )
}
