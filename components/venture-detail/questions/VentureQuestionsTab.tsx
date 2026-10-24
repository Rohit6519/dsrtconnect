'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  CircleNotch, PencilSimple, CheckCircle, ArrowRight,
  Warning, Lightbulb, Target, UsersThree, Package,
  ChartLineUp, Handshake, Flag, MagnifyingGlass,
  CaretDown, CaretRight, Question
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { QuestionRichEditor } from './QuestionRichEditor'
import { QuestionChipsEditor } from './QuestionChipsEditor'
import { QuestionSelectEditor } from './QuestionSelectEditor'

interface Props {
  slug: string
  isOwner: boolean
}

type FieldType = 'text' | 'rich' | 'chips' | 'select' | 'grid'

interface FieldDef {
  table: string
  field: string
  label: string
  hint?: string
  type: FieldType
  placeholder?: string
  options?: { value: string; label: string }[]
  maxLen?: number
}

interface SectionDef {
  id: string
  step: number
  title: string
  subtitle: string
  icon: any
  fields: FieldDef[]
}

// ─── TAXONOMIES ───
const IMPACT_TAG_OPTIONS = [
  { value: 'time_loss', label: 'Time loss' },
  { value: 'money_loss', label: 'Money loss' },
  { value: 'operational_inefficiency', label: 'Operational inefficiency' },
  { value: 'missed_opportunity', label: 'Missed opportunity' },
  { value: 'poor_experience', label: 'Poor experience' },
  { value: 'risk', label: 'Risk exposure' },
  { value: 'other', label: 'Other' },
]

const DISCOVERY_SOURCE_OPTIONS = [
  { value: 'personal', label: 'I experienced it personally' },
  { value: 'observed', label: 'I observed others facing it' },
  { value: 'industry', label: 'I worked in the industry' },
  { value: 'research', label: 'Through research' },
  { value: 'conversations', label: 'Customer conversations' },
  { value: 'academic', label: 'Academic or project work' },
  { value: 'other', label: 'Other' },
]

const BUILD_RISK_OPTIONS = [
  { value: 'technical', label: 'Technical' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'distribution', label: 'Distribution' },
  { value: 'capital', label: 'Capital' },
  { value: 'operations', label: 'Operations' },
  { value: 'trust', label: 'Trust / adoption' },
  { value: 'other', label: 'Other' },
]

const DISTRIBUTION_CHANNEL_OPTIONS = [
  { value: 'direct_outreach', label: 'Direct outreach' },
  { value: 'community', label: 'Community' },
  { value: 'organic_search', label: 'Organic search / SEO' },
  { value: 'partnerships', label: 'Partnerships' },
  { value: 'sales', label: 'Direct sales' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'referrals', label: 'Referrals' },
  { value: 'paid_acquisition', label: 'Paid acquisition' },
  { value: 'content', label: 'Content / thought leadership' },
  { value: 'events', label: 'Events' },
  { value: 'other', label: 'Other' },
]

const RISK_CATEGORY_OPTIONS = [
  { value: 'no_demand', label: 'No real demand' },
  { value: 'competition', label: 'Competition' },
  { value: 'technology', label: 'Technology' },
  { value: 'regulation', label: 'Regulation' },
  { value: 'distribution', label: 'Distribution' },
  { value: 'team', label: 'Team' },
  { value: 'capital', label: 'Capital' },
  { value: 'execution', label: 'Execution' },
  { value: 'other', label: 'Other' },
]

// ─── SECTION DEFINITIONS ───
const SECTIONS: SectionDef[] = [
  {
    id: 'problem', step: 2, title: 'The Problem', subtitle: 'What you\'re solving and who it hurts', icon: Target,
    fields: [
      { table: 'venture_problems', field: 'problem_statement', label: 'What specific problem are you solving?', hint: 'One or two concrete sentences.', type: 'rich', placeholder: 'Describe the exact problem — not the industry, not the trend.' },
      { table: 'venture_problems', field: 'affected_audience', label: 'Who experiences this problem most strongly?', hint: 'A specific first target — not "everyone."', type: 'rich', placeholder: 'e.g. Small-clinic operations managers with 5–15 staff.' },
      { table: 'venture_problems', field: 'problem_context', label: 'When does this problem occur?', hint: 'A real situation where someone encounters it.', type: 'rich', placeholder: 'Paint a scene. Where are they, what breaks?' },
      { table: 'venture_problems', field: 'impact_tags', label: 'What happens because this problem exists?', hint: 'Select all that apply.', type: 'chips', options: IMPACT_TAG_OPTIONS },
      { table: 'venture_problems', field: 'impact_explanation', label: 'Explain the impact.', type: 'rich', placeholder: 'What does the person lose, feel, or miss?' },
      { table: 'venture_problems', field: 'discovery_source', label: 'How did you discover this problem?', type: 'select', options: DISCOVERY_SOURCE_OPTIONS },
      { table: 'venture_problems', field: 'discovery_details', label: 'What did you discover?', type: 'rich', placeholder: 'Specific moments, conversations, or observations.' },
    ],
  },
  {
    id: 'insight', step: 3, title: 'The Insight', subtitle: 'Why you believe this should exist', icon: Lightbulb,
    fields: [
      { table: 'venture_insights', field: 'why_worth_solving', label: 'Why do you believe this problem is worth solving?', type: 'rich', placeholder: 'What makes this urgent, important, or worth years of your life?' },
      { table: 'venture_insights', field: 'supporting_observations', label: 'What have you observed that supports your belief?', hint: 'Facts, patterns, conversations, data.', type: 'rich' },
      { table: 'venture_insights', field: 'overlooked_understanding', label: 'What do you understand that others may overlook?', type: 'rich' },
      { table: 'venture_insights', field: 'evolved_thinking', label: 'What evolved in your thinking?', type: 'rich' },
      { table: 'venture_insights', field: 'falsifiable_evidence', label: 'What evidence could prove your assumption wrong?', hint: 'Optional but powerful.', type: 'rich' },
    ],
  },
  {
    id: 'customer', step: 4, title: 'Customer', subtitle: 'Who you serve and how they cope today', icon: UsersThree,
    fields: [
      { table: 'venture_customer_profiles', field: 'first_customer', label: 'Who is your first real customer or user?', type: 'rich', placeholder: 'One specific persona or company profile.' },
      { table: 'venture_customer_profiles', field: 'why_change_behavior', label: 'Why would someone change their current behavior?', type: 'rich' },
      { table: 'venture_customer_profiles', field: '__grid_persona', label: 'User, decision maker, and buyer', hint: 'Especially important for B2B. In B2C these can be the same.', type: 'grid' },
    ],
  },
  {
    id: 'solution', step: 5, title: 'The Solution', subtitle: 'What you\'re building and how it works', icon: Package,
    fields: [
      { table: 'venture_solutions', field: 'solution_description', label: 'What is your solution?', type: 'rich' },
      { table: 'venture_solutions', field: 'how_it_solves_problem', label: 'How does it solve the specific problem?', type: 'rich' },
      { table: 'venture_solutions', field: 'user_flow_before', label: 'Before using your solution', hint: 'The user\'s current situation.', type: 'rich' },
      { table: 'venture_solutions', field: 'user_flow_action', label: 'User takes this action', type: 'rich' },
      { table: 'venture_solutions', field: 'user_flow_product', label: 'Your product does this', type: 'rich' },
      { table: 'venture_solutions', field: 'user_flow_outcome', label: 'The user receives this outcome', type: 'rich' },
      { table: 'venture_solutions', field: 'mvp_definition', label: 'What is the smallest version you could build?', type: 'rich' },
      { table: 'venture_solutions', field: 'build_risk_tags', label: 'What is difficult about building this?', type: 'chips', options: BUILD_RISK_OPTIONS },
      { table: 'venture_solutions', field: 'build_risk_explanation', label: 'Explain the hardest challenge.', type: 'rich' },
    ],
  },
  {
    id: 'market', step: 6, title: 'Market', subtitle: 'Size, opportunity, and distribution', icon: ChartLineUp,
    fields: [
      { table: 'venture_markets', field: 'initial_market', label: 'Who is your initial market?', type: 'rich' },
      { table: 'venture_markets', field: 'market_size_estimate', label: 'How many potential customers?', hint: 'Number, order of magnitude, or a range.', type: 'text', maxLen: 200 },
      { table: 'venture_markets', field: 'estimation_methodology', label: 'How did you estimate that?', hint: 'Methodology matters more than the number.', type: 'rich' },
      { table: 'venture_markets', field: 'serviceable_market', label: 'Serviceable market', type: 'rich' },
      { table: 'venture_markets', field: 'broader_opportunity', label: 'Broader opportunity', type: 'rich' },
      { table: 'venture_markets', field: 'distribution_channels', label: 'How will you reach customers?', type: 'chips', options: DISTRIBUTION_CHANNEL_OPTIONS },
      { table: 'venture_markets', field: 'distribution_rationale', label: 'Why does this approach work?', type: 'rich' },
    ],
  },
  {
    id: 'competition', step: 7, title: 'Competition', subtitle: 'Your edge, honest weaknesses, and moat', icon: Handshake,
    fields: [
      { table: 'venture_differentiation', field: 'why_choose_us', label: 'Why might someone choose your approach?', type: 'rich' },
      { table: 'venture_differentiation', field: 'why_reject_us', label: 'Why might they reject it?', hint: 'Honesty here is a signal of strength.', type: 'rich' },
      { table: 'venture_differentiation', field: 'moat_from_larger_players', label: 'What would stop a larger company from doing this?', hint: 'It\'s okay to say "nothing yet."', type: 'rich' },
    ],
  },
  {
    id: 'founder', step: 8, title: 'Founder & Team', subtitle: 'The people behind it and capability gaps', icon: UsersThree,
    fields: [
      { table: 'venture_founder_answers', field: 'why_solve_this', label: 'Why do you want to solve this problem?', type: 'rich' },
      { table: 'venture_founder_answers', field: 'relevant_experience', label: 'What experience do you have?', type: 'rich' },
      { table: 'venture_founder_answers', field: 'founder_advantage', label: 'What gives you an advantage?', type: 'rich' },
      { table: 'venture_founder_answers', field: 'what_to_learn', label: 'What do you still need to learn?', type: 'rich' },
      { table: 'venture_capabilities', field: 'most_critical_gap', label: 'What is your team\'s most critical gap?', type: 'rich' },
    ],
  },
  {
    id: 'risks', step: 9, title: 'Reality Check', subtitle: 'Biggest risks and strategy pivots', icon: Warning,
    fields: [
      { table: 'venture_risks', field: 'biggest_risk', label: 'What is currently the biggest risk?', type: 'rich' },
      { table: 'venture_risks', field: 'risk_category', label: 'Risk category', type: 'select', options: RISK_CATEGORY_OPTIONS },
      { table: 'venture_risks', field: 'strategy_pivot_trigger', label: 'What could change your strategy fundamentally?', type: 'rich' },
    ],
  },
  {
    id: 'next_move', step: 10, title: 'Next Move', subtitle: 'What you\'ll prove and do next', icon: Flag,
    fields: [
      { table: 'venture_next_moves', field: 'most_important_proof', label: 'What is the most important thing to prove next?', type: 'rich' },
      { table: 'venture_next_moves', field: 'proof_action_plan', label: 'What will you do to prove it?', type: 'rich' },
      { table: 'venture_next_moves', field: 'thirty_day_focus', label: 'Your 30-day focus', hint: 'This becomes your public "current focus".', type: 'rich' },
      { table: 'venture_next_moves', field: 'biggest_blocker', label: 'Biggest blocker', type: 'rich' },
    ],
  },
]

export function VentureQuestionsTab({ slug, isOwner }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [openSection, setOpenSection] = useState<string | null>('problem')
  const [savingField, setSavingField] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ventures/${slug}/assessment`)
      const json = await res.json()
      
      // ── NEW LOGIC: Gracefully handle unpublished state for viewers ──
      if (json.unpublished) {
        setData({ unpublished: true })
        return
      }

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load')
      }
      
      setData(json)
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { load() }, [load])

  const getValue = useCallback((table: string, field: string): any => {
    if (!data || data.unpublished) return null
    if (table === 'ventures') return data.venture?.[field]

    const map: Record<string, string> = {
      venture_problems: 'step2_problem',
      venture_insights: 'step3_insight',
      venture_customer_profiles: 'step4_customer.profile',
      venture_solutions: 'step5_solution',
      venture_markets: 'step6_market',
      venture_differentiation: 'step7_competition.differentiation',
      venture_founder_answers: 'step8_founder_team.founder_answers',
      venture_capabilities: 'step8_founder_team.capabilities',
      venture_risks: 'step9_reality_check.risks',
      venture_next_moves: 'step10_next_move.next_move',
    }

    const path = map[table]
    if (!path) return null
    const parts = path.split('.')
    let cursor: any = data.steps
    for (const p of parts) {
      cursor = cursor?.[p]
      if (!cursor) return null
    }
    return cursor?.[field]
  }, [data])

  const saveField = useCallback(async (table: string, field: string, value: any) => {
    const key = `${table}.${field}`
    setSavingField(key)
    try {
      const res = await fetch(`/api/ventures/${slug}/assessment/answers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, fields: { [field]: value } }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Save failed')
      }
      setData((prev: any) => {
        if (!prev) return prev
        const next = structuredClone(prev)
        if (table === 'ventures') {
          next.venture = { ...next.venture, [field]: value }
        } else {
          const map: Record<string, string[]> = {
            venture_problems: ['step2_problem'],
            venture_insights: ['step3_insight'],
            venture_customer_profiles: ['step4_customer', 'profile'],
            venture_solutions: ['step5_solution'],
            venture_markets: ['step6_market'],
            venture_differentiation: ['step7_competition', 'differentiation'],
            venture_founder_answers: ['step8_founder_team', 'founder_answers'],
            venture_capabilities: ['step8_founder_team', 'capabilities'],
            venture_risks: ['step9_reality_check', 'risks'],
            venture_next_moves: ['step10_next_move', 'next_move'],
          }
          const path = map[table]
          if (path) {
            let cursor: any = next.steps
            for (let i = 0; i < path.length - 1; i++) {
              if (!cursor[path[i]]) cursor[path[i]] = {}
              cursor = cursor[path[i]]
            }
            const leaf = path[path.length - 1]
            if (!cursor[leaf]) cursor[leaf] = {}
            cursor[leaf] = { ...cursor[leaf], [field]: value }
          }
        }
        return next
      })
      toast.success('Saved', { duration: 1200 })
    } catch (e: any) {
      toast.error(e.message || 'Save failed')
    } finally {
      setSavingField(null)
    }
  }, [slug])

  const sectionCounts = useMemo(() => {
    if (!data || data.unpublished) return {}
    const counts: Record<string, { filled: number; total: number }> = {}
    for (const s of SECTIONS) {
      let filled = 0
      let total = 0
      for (const f of s.fields) {
        if (f.type === 'grid') {
          const gridFields = ['user_persona', 'decision_maker', 'buyer_persona']
          for (const gf of gridFields) {
            total++
            const v = getValue(f.table, gf)
            if (v && String(v).trim().length > 0) filled++
          }
        } else {
          total++
          const v = getValue(f.table, f.field)
          if (Array.isArray(v)) { if (v.length > 0) filled++ }
          else if (v && String(v).trim().length > 0) filled++
        }
      }
      counts[s.id] = { filled, total }
    }
    return counts
  }, [data, getValue])

  const filteredSections = useMemo(() => {
    if (!search.trim()) return SECTIONS
    const q = search.toLowerCase()
    return SECTIONS.map(s => ({
      ...s,
      fields: s.fields.filter(f =>
        f.label.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        (getValue(f.table, f.field) || '').toString().toLowerCase().includes(q)
      )
    })).filter(s => s.fields.length > 0)
  }, [search, getValue])

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 flex items-center justify-center gap-2 text-[13px] text-white/50">
        <CircleNotch size={16} className="animate-spin" /> Loading questions…
      </div>
    )
  }

  // ── NEW LOGIC: Empty state for public viewers when unpublished ──
  if (data?.unpublished) {
    return (
      <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] p-16 text-center mt-6">
        <Question size={32} className="text-white/20 mx-auto mb-3" />
        <h3 className="text-[15px] font-bold text-white mb-1">Assessment not published</h3>
        <p className="text-[12.5px] text-white/45 max-w-sm mx-auto">
          This venture has not published their assessment answers yet. When they do, their insights, market analysis, and approach will appear here.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
        <Warning size={20} className="text-white/40 mx-auto mb-2" />
        <p className="text-[13px] text-white/60 mb-4">{error}</p>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-white text-black text-[12.5px] font-semibold"
        >
          Retry
        </button>
      </div>
    )
  }

  const totalFilled = Object.values(sectionCounts).reduce((s, c) => s + c.filled, 0)
  const totalFields = Object.values(sectionCounts).reduce((s, c) => s + c.total, 0)
  const overallPct = totalFields ? Math.round((totalFilled / totalFields) * 100) : 0
  const assessmentStatus = data?.assessment?.status || 'not_started'
  const hasAnyAnswers = totalFilled > 0

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
          <div>
            <h2 className="text-[20px] font-bold text-white">Questions</h2>
            <p className="text-[13px] text-white/50 mt-1 max-w-2xl">
              Every question from your venture assessment, in one place. Answers sync automatically
              with your Overview and discovery.
            </p>
          </div>
          {isOwner && (
            <Link
              href={`/ventures/${slug}/assessment/1`}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] text-[12.5px] font-semibold text-white transition-colors"
            >
              <PencilSimple size={12} />
              Open guided flow
            </Link>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-semibold text-white">
                {overallPct}% complete
              </span>
              <span className="text-[11.5px] text-white/50">
                · {totalFilled} of {totalFields} fields
              </span>
            </div>
            {data.venture?.has_verified_assessment && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded">
                <CheckCircle size={10} weight="fill" /> Verified
              </span>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>
      </div>

      {!hasAnyAnswers && assessmentStatus === 'not_started' && isOwner && (
        <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.1] flex items-center justify-center flex-shrink-0">
              <CheckCircle size={14} weight="fill" className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-[14.5px] font-bold text-white">Start the Venture Assessment</h3>
              <p className="text-[12.5px] text-white/60 mt-1 leading-relaxed">
                Answer these 10 sections of structured questions to unlock the Verified badge
                and make your venture eligible for discovery.
              </p>
              <Link
                href={`/ventures/${slug}/assessment/1`}
                className="inline-flex items-center gap-1.5 mt-3 h-9 px-4 rounded-lg bg-white text-black hover:bg-zinc-100 text-[12.5px] font-bold transition-colors"
              >
                Start assessment <ArrowRight size={12} weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search questions and answers…"
          className="w-full h-10 pl-9 pr-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.18]"
        />
      </div>

      <div className="space-y-3">
        {filteredSections.map(section => {
          const Icon = section.icon
          const count = sectionCounts[section.id]
          const isOpen = openSection === section.id || !!search.trim()
          const complete = count && count.filled === count.total
          const pct = count && count.total ? (count.filled / count.total) * 100 : 0

          return (
            <div
              key={section.id}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
            >
              <button
                onClick={() => setOpenSection(isOpen ? null : section.id)}
                className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className={
                  'w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ' +
                  (complete
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                    : 'bg-white/[0.04] border-white/[0.08] text-white/70')
                }>
                  {complete ? <CheckCircle size={15} weight="fill" /> : <Icon size={15} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14.5px] font-bold text-white">{section.title}</h3>
                    <span className="text-[10.5px] font-mono text-white/40">
                      Step {section.step}
                    </span>
                  </div>
                  <p className="text-[12px] text-white/50 mt-0.5">{section.subtitle}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-24 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full bg-white/60 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10.5px] text-white/45 tabular-nums">
                      {count?.filled || 0}/{count?.total || 0}
                    </span>
                  </div>
                </div>

                {isOpen
                  ? <CaretDown size={14} className="text-white/40 flex-shrink-0" />
                  : <CaretRight size={14} className="text-white/40 flex-shrink-0" />
                }
              </button>

              {isOpen && (
                <div className="border-t border-white/[0.05] px-5 py-5 space-y-5">
                  {section.fields.map(f => (
                    <FieldRow
                      key={`${f.table}.${f.field}`}
                      field={f}
                      valueGetter={getValue}
                      onSave={saveField}
                      saving={savingField === `${f.table}.${f.field}`}
                      isOwner={isOwner}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isOwner && (
        <div className="text-center pt-4">
          <p className="text-[11.5px] text-white/40">
            Changes save automatically and sync with your Overview.
          </p>
        </div>
      )}
    </div>
  )
}

interface FieldRowProps {
  field: FieldDef
  valueGetter: (table: string, field: string) => any
  onSave: (table: string, field: string, value: any) => Promise<void>
  saving: boolean
  isOwner: boolean
}

function FieldRow({ field, valueGetter, onSave, saving, isOwner }: FieldRowProps) {
  if (field.type === 'grid') {
    return (
      <div>
        <p className="text-[12.5px] font-semibold text-white mb-1">{field.label}</p>
        {field.hint && <p className="text-[11.5px] text-white/45 mb-2.5">{field.hint}</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { key: 'user_persona', label: 'User', placeholder: 'Who uses it daily' },
            { key: 'decision_maker', label: 'Decision maker', placeholder: 'Who chooses to adopt it' },
            { key: 'buyer_persona', label: 'Buyer', placeholder: 'Who signs the check' },
          ].map(g => (
            <div key={g.key}>
              <p className="text-[10.5px] font-mono uppercase tracking-widest text-white/50 font-semibold mb-1.5">
                {g.label}
              </p>
              <QuestionRichEditor
                value={valueGetter(field.table, g.key) || ''}
                onSave={(v) => onSave(field.table, g.key, v)}
                placeholder={g.placeholder}
                singleLine
                maxLen={200}
                disabled={!isOwner}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const value = valueGetter(field.table, field.field)

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[12.5px] font-semibold text-white">{field.label}</p>
        {saving && (
          <span className="inline-flex items-center gap-1 text-[10.5px] text-white/50">
            <CircleNotch size={9} className="animate-spin" /> Saving
          </span>
        )}
      </div>
      {field.hint && <p className="text-[11.5px] text-white/45 mb-2">{field.hint}</p>}

      {field.type === 'text' && (
        <QuestionRichEditor
          value={value || ''}
          onSave={(v) => onSave(field.table, field.field, v)}
          placeholder={field.placeholder}
          singleLine
          maxLen={field.maxLen}
          disabled={!isOwner}
        />
      )}

      {field.type === 'rich' && (
        <QuestionRichEditor
          value={value || ''}
          onSave={(v) => onSave(field.table, field.field, v)}
          placeholder={field.placeholder}
          maxLen={field.maxLen}
          disabled={!isOwner}
        />
      )}

      {field.type === 'chips' && field.options && (
        <QuestionChipsEditor
          value={Array.isArray(value) ? value : []}
          options={field.options}
          onSave={(v) => onSave(field.table, field.field, v)}
          disabled={!isOwner}
        />
      )}

      {field.type === 'select' && field.options && (
        <QuestionSelectEditor
          value={value || ''}
          options={field.options}
          onSave={(v) => onSave(field.table, field.field, v)}
          disabled={!isOwner}
        />
      )}
    </div>
  )
}