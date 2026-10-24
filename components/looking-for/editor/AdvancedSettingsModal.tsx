'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  X, Check, Plus, Trash, GripVertical, Warning,
  ShieldCheck, Question, UsersThree, MagnifyingGlass, CircleNotch,
} from '@phosphor-icons/react'
import type { DraftState, CustomQuestion, ApplicationConfig } from './useDraftEditor'

interface Props {
  draft: DraftState
  onChange: (patch: Partial<DraftState>) => void
  onClose: () => void
}

type Tab = 'application' | 'questions' | 'hiring_team'

export function AdvancedSettingsModal({ draft, onChange, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('application')

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const cfg = draft.application_config

  const updateCfg = (patch: Partial<ApplicationConfig>) => {
    onChange({ application_config: { ...cfg, ...patch } })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] rounded-xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 shrink-0 flex items-center justify-between">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-1">
              Advanced settings
            </div>
            <h2 className="text-[16px] font-semibold text-white">Application configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-4">
            <SubTab active={tab === 'application'} onClick={() => setTab('application')} Icon={ShieldCheck}>
              Application
            </SubTab>
            <SubTab active={tab === 'questions'} onClick={() => setTab('questions')} Icon={Question}>
              Questions
              {draft.custom_questions.length > 0 && (
                <span className="text-zinc-500 ml-1">· {draft.custom_questions.length}</span>
              )}
            </SubTab>
            <SubTab active={tab === 'hiring_team'} onClick={() => setTab('hiring_team')} Icon={UsersThree}>
              Hiring team
            </SubTab>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'application' && (
            <ApplicationTab config={cfg} onChange={updateCfg} />
          )}
          {tab === 'questions' && (
            <QuestionsTab
              questions={draft.custom_questions}
              onChange={(qs) => onChange({ custom_questions: qs })}
            />
          )}
          {tab === 'hiring_team' && (
            <HiringTeamTab requestId={draft.id} />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 shrink-0 flex items-center justify-between">
          <div className="text-[11px] text-zinc-500">
            Changes save automatically.
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center h-8 px-3 rounded-md bg-white text-black hover:bg-zinc-200 text-[12.5px] font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

function SubTab({
  active, onClick, Icon, children,
}: {
  active: boolean
  onClick: () => void
  Icon: any
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={
        'relative inline-flex items-center gap-1.5 py-3 text-[12.5px] font-semibold tracking-tight transition-colors ' +
        (active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300')
      }
    >
      <Icon size={12} weight={active ? 'fill' : 'regular'} />
      {children}
      {active && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" />}
    </button>
  )
}

// -------- APPLICATION TAB --------

function ApplicationTab({
  config, onChange,
}: {
  config: ApplicationConfig
  onChange: (patch: Partial<ApplicationConfig>) => void
}) {
  return (
    <div className="space-y-6">
      <Section title="Who can apply?">
        <div className="space-y-1.5">
          <RadioCard
            label="Everyone"
            description="Anyone with a DSRT account can apply"
            checked={config.visibility === 'everyone'}
            onClick={() => onChange({ visibility: 'everyone' })}
          />
          <RadioCard
            label="DSRT members only"
            description="Only signed-in DSRT members"
            checked={config.visibility === 'members_only'}
            onClick={() => onChange({ visibility: 'members_only' })}
          />
          <RadioCard
            label="Verified builders only"
            description="Only verified builders can apply"
            checked={config.visibility === 'verified_only'}
            onClick={() => onChange({ visibility: 'verified_only' })}
          />
          <RadioCard
            label="Invite only"
            description="Only people you specifically invite can apply"
            checked={config.visibility === 'invite_only'}
            onClick={() => onChange({ visibility: 'invite_only' })}
          />
        </div>
      </Section>

      <Section title="Application deadline">
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={config.application_deadline ? config.application_deadline.slice(0, 10) : ''}
            onChange={(e) => onChange({ application_deadline: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-700"
          />
          {config.application_deadline && (
            <button
              onClick={() => onChange({ application_deadline: null })}
              className="text-[12px] text-zinc-500 hover:text-zinc-300"
            >
              Remove deadline
            </button>
          )}
        </div>
        <p className="text-[11.5px] text-zinc-500 mt-1.5">
          Applications automatically close after this date.
        </p>
      </Section>

      <Section title="Application materials" subtitle="What applicants must provide">
        <div className="space-y-1.5">
          <CheckRow
            label="DSRT profile"
            description="Applicants use their DSRT profile as their identity"
            checked={config.require_dsrt_profile}
            onChange={(v) => onChange({ require_dsrt_profile: v })}
          />
          <CheckRow
            label="Short introduction"
            description="A brief message about themselves and why they're applying"
            checked={config.require_short_intro}
            onChange={(v) => onChange({ require_short_intro: v })}
          />
          <CheckRow
            label="Relevant experience"
            description="Longer form response about their fit"
            checked={config.require_relevant_experience}
            onChange={(v) => onChange({ require_relevant_experience: v })}
          />
          <CheckRow
            label="Cover letter"
            description="Formal written cover letter"
            checked={config.require_cover_letter}
            onChange={(v) => onChange({ require_cover_letter: v })}
          />
          <CheckRow
            label="Resume"
            description="Uploaded CV or resume URL"
            checked={config.require_resume}
            onChange={(v) => onChange({ require_resume: v })}
          />
          <CheckRow
            label="Portfolio"
            description="Link to portfolio or previous work"
            checked={config.require_portfolio}
            onChange={(v) => onChange({ require_portfolio: v })}
          />
          <CheckRow
            label="GitHub"
            description="GitHub profile URL"
            checked={config.require_github}
            onChange={(v) => onChange({ require_github: v })}
          />
          <CheckRow
            label="Website"
            description="Personal website or blog"
            checked={config.require_website}
            onChange={(v) => onChange({ require_website: v })}
          />
        </div>
      </Section>

      <Section title="Accepting applications">
        <label className="flex items-start gap-3 cursor-pointer">
          <button
            type="button"
            onClick={() => onChange({ applications_open: !config.applications_open })}
            role="switch"
            aria-checked={config.applications_open}
            className={
              'relative shrink-0 w-9 h-5 rounded-full transition-colors mt-0.5 ' +
              (config.applications_open ? 'bg-blue-600' : 'bg-zinc-800')
            }
          >
            <span className={
              'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ' +
              (config.applications_open ? 'left-[18px]' : 'left-0.5')
            } />
          </button>
          <div>
            <div className="text-[13px] font-medium text-zinc-200">
              {config.applications_open ? 'Accepting applications' : 'Applications paused'}
            </div>
            <div className="text-[11.5px] text-zinc-500 mt-0.5 leading-relaxed">
              Turn off to keep the opportunity visible but stop accepting new applications.
            </div>
          </div>
        </label>
      </Section>
    </div>
  )
}

// -------- QUESTIONS TAB --------

function QuestionsTab({
  questions, onChange,
}: {
  questions: CustomQuestion[]
  onChange: (qs: CustomQuestion[]) => void
}) {
  const addQuestion = () => {
    const newQ: CustomQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      question: '',
      type: 'short_answer',
      required: false,
    }
    onChange([...questions, newQ])
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
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[13px] font-medium text-zinc-200">Custom questions</div>
          <div className="text-[11.5px] text-zinc-500 mt-0.5">
            Ask applicants specific questions to help evaluate fit.
          </div>
        </div>
        <button
          onClick={addQuestion}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-zinc-800 hover:border-zinc-600 text-[12.5px] font-medium text-zinc-200"
        >
          <Plus size={11} weight="bold" />
          Add question
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center">
          <Question size={18} className="text-zinc-600 mx-auto mb-2" />
          <div className="text-[13px] text-zinc-400 mb-1">No custom questions yet</div>
          <div className="text-[11.5px] text-zinc-500">
            Applicants will only be asked for the materials you selected.
          </div>
        </div>
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
  const [showOptions, setShowOptions] = useState(question.type === 'multiple_choice')

  useEffect(() => {
    setShowOptions(question.type === 'multiple_choice')
  }, [question.type])

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
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-start gap-2 mb-3">
        <div className="flex flex-col items-center gap-0.5 shrink-0 pt-1">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="w-5 h-4 rounded text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed text-[10px]"
            aria-label="Move up"
          >
            ▲
          </button>
          <div className="text-[10px] font-mono text-zinc-600">{String(index + 1).padStart(2, '0')}</div>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="w-5 h-4 rounded text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed text-[10px]"
            aria-label="Move down"
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
            className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 resize-none leading-relaxed"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={question.type}
              onChange={(e) => onUpdate({ type: e.target.value as CustomQuestion['type'] })}
              className="h-7 px-2.5 rounded-md bg-zinc-950 border border-zinc-800 text-[11.5px] text-zinc-200 focus:outline-none focus:border-zinc-700 cursor-pointer"
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
                className="w-3.5 h-3.5 accent-blue-500"
              />
              <span className="text-[11.5px] text-zinc-400">Required</span>
            </label>
          </div>

          {showOptions && (
            <div className="pt-2 border-t border-zinc-800/60 space-y-1.5">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Options
              </div>
              {(question.options || []).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 h-7 px-2.5 rounded bg-zinc-950 border border-zinc-800 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
                  />
                  <button
                    onClick={() => removeOption(i)}
                    className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                    aria-label="Remove option"
                  >
                    <X size={10} weight="bold" />
                  </button>
                </div>
              ))}
              <button
                onClick={addOption}
                className="inline-flex items-center gap-1 text-[11.5px] text-zinc-400 hover:text-zinc-200 mt-1"
              >
                <Plus size={9} weight="bold" />
                Add option
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onRemove}
          className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
          aria-label="Remove question"
        >
          <Trash size={12} />
        </button>
      </div>
    </div>
  )
}

// -------- HIRING TEAM TAB --------

interface HiringMember {
  id: string
  user_id: string
  role: string
  can_view: boolean
  can_review: boolean
  can_message: boolean
  can_change_status: boolean
  can_accept: boolean
  can_reject: boolean
  can_edit: boolean
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

function HiringTeamTab({ requestId }: { requestId: string | null }) {
  const [members, setMembers] = useState<HiringMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  const load = async () => {
    if (!requestId) {
      setLoading(false)
      return
    }
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
    if (!query || query.length < 2) {
      setResults([])
      return
    }
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
    if (!requestId) {
      window.alert('Save the draft first before adding hiring team members.')
      return
    }
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
    if (!confirm('Remove this member from the hiring team?')) return
    try {
      await fetch(`/api/looking-for/drafts/${requestId}/hiring-team/${memberId}`, {
        method: 'DELETE',
      })
      await load()
    } catch { /* ignore */ }
  }

  if (!requestId) {
    return (
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-2">
        <Warning size={14} weight="fill" className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-[12.5px] text-zinc-300 leading-relaxed">
          Save your draft first (add a title) — then you can invite team members to help review applications.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[13px] font-medium text-zinc-200 mb-1">Add team members</div>
        <div className="text-[11.5px] text-zinc-500 mb-3">
          Invite people to help you review and respond to applications.
        </div>
        <div className="relative">
          <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search DSRT members by name or username..."
            className="w-full h-9 pl-9 pr-3 rounded-md bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
          />
          {(searching || results.length > 0) && query.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-md border border-zinc-800 bg-[#0a0a0a] shadow-xl z-10">
              {searching ? (
                <div className="px-3 py-2 text-[12px] text-zinc-500 flex items-center gap-2">
                  <CircleNotch size={11} className="animate-spin" />
                  Searching...
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
                        <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[11px] text-zinc-400 shrink-0">
                          {u.full_name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] text-zinc-200 truncate">{u.full_name}</div>
                        {u.tagline && (
                          <div className="text-[10.5px] text-zinc-500 truncate">{u.tagline}</div>
                        )}
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

      <div>
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-2">
          Team ({members.length})
        </div>
        {loading ? (
          <div className="text-[12px] text-zinc-500 flex items-center gap-2 py-4">
            <CircleNotch size={11} className="animate-spin" />
            Loading...
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-center">
            <UsersThree size={16} className="text-zinc-600 mx-auto mb-2" />
            <div className="text-[12px] text-zinc-500">Just you for now. Add teammates above.</div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/40">
                {m.user?.avatar_url ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 shrink-0 relative">
                    <Image src={m.user.avatar_url} alt="" fill className="object-cover" sizes="32px" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[12px] text-zinc-400 shrink-0">
                    {m.user?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-zinc-200 truncate">{m.user?.full_name}</div>
                  <div className="text-[11px] text-zinc-500 truncate">@{m.user?.username}</div>
                </div>
                <select
                  value={m.role}
                  onChange={(e) => updateMemberRole(m.id, e.target.value)}
                  className="h-7 px-2 rounded bg-zinc-950 border border-zinc-800 text-[11.5px] text-zinc-200 cursor-pointer focus:outline-none capitalize"
                >
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={() => removeMember(m.id)}
                  className="w-7 h-7 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                  aria-label="Remove"
                >
                  <Trash size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 text-[10.5px] text-zinc-600 leading-relaxed">
          <span className="font-semibold text-zinc-500">Owner:</span> full access · <span className="font-semibold text-zinc-500">Manager:</span> review, message, accept/reject · <span className="font-semibold text-zinc-500">Reviewer:</span> review + message · <span className="font-semibold text-zinc-500">Viewer:</span> view only.
        </div>
      </div>

      {error && (
        <div className="text-[12px] text-red-400">{error}</div>
      )}
    </div>
  )
}

// -------- SHARED PRIMITIVES --------

function Section({
  title, subtitle, children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-3">
        <div className="text-[13px] font-medium text-zinc-200">{title}</div>
        {subtitle && (
          <div className="text-[11.5px] text-zinc-500 mt-0.5 leading-relaxed">{subtitle}</div>
        )}
      </div>
      {children}
    </div>
  )
}

function RadioCard({
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
        'w-full text-left p-3 rounded-lg border transition-all group ' +
        (checked
          ? 'border-blue-500/40 bg-blue-500/[0.04]'
          : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-600')
      }
    >
      <div className="flex items-start gap-3">
        <div className={
          'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ' +
          (checked ? 'border-blue-500' : 'border-zinc-600')
        }>
          {checked && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
        </div>
        <div>
          <div className={
            'text-[13px] font-medium ' +
            (checked ? 'text-white' : 'text-zinc-200')
          }>
            {label}
          </div>
          <div className="text-[11.5px] text-zinc-500 mt-0.5 leading-relaxed">{description}</div>
        </div>
      </div>
    </button>
  )
}

function CheckRow({
  label, description, checked, onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-zinc-900/40 cursor-pointer transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 mt-1 accent-blue-500 shrink-0"
      />
      <div>
        <div className="text-[13px] text-zinc-200">{label}</div>
        <div className="text-[11.5px] text-zinc-500 mt-0.5 leading-relaxed">{description}</div>
      </div>
    </label>
  )
}
