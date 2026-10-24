'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAssessment } from '../AssessmentContext'
import { AssessmentTopBar } from '../AssessmentTopBar'
import { AssessmentTipsCard } from '../AssessmentTipsCard'
import {
  PencilSimple, CircleNotch, CheckCircle, ArrowRight, Warning
} from '@phosphor-icons/react'
import { toast } from 'sonner'

export function AssessmentReview() {
  const router = useRouter()
  const {
    slug, data, loading, error,
    goToStep, publishAssessment
  } = useAssessment()

  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<{ error: string; missing?: any[] } | null>(null)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center">
        <div className="inline-flex items-center gap-2 text-[13px] text-zinc-400">
          <CircleNotch size={16} className="animate-spin" /> Loading review…
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h2 className="text-[18px] font-bold text-white mb-2">Unable to load review</h2>
          <p className="text-[13px] text-zinc-400 mb-4">{error || 'Please try again.'}</p>
        </div>
      </div>
    )
  }

  const s = data.steps
  const v = data.venture

  const handlePublish = async () => {
    setPublishing(true)
    setPublishError(null)
    const result = await publishAssessment()
    if (result.success) {
      toast.success('Venture published')
      router.push(`/ventures/${slug}?published=1`)
    } else {
      setPublishError({ error: result.error || 'Publish failed', missing: result.missing })
      setPublishing(false)
    }
  }

  const edit = (step: number) => goToStep(step)

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <AssessmentTopBar />

      <div className="max-w-[1000px] mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-3">
            Final Review
          </p>
          <h1 className="text-[26px] font-bold text-white tracking-tight leading-tight">
            Your venture is ready to be created.
          </h1>
          <p className="text-[14px] text-zinc-400 mt-2 leading-relaxed max-w-2xl">
            Review each section below. When you publish, your venture becomes visible on
            DSRT Connect with the Verified Assessment badge.
          </p>
        </div>

        {publishError && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/[0.05] p-4">
            <div className="flex items-start gap-3">
              <Warning size={16} weight="fill" className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-red-200">
                  {publishError.error}
                </p>
                {publishError.missing && publishError.missing.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[11.5px] text-red-300/80">Missing required fields:</p>
                    <ul className="space-y-1">
                      {publishError.missing.map((m: any, i: number) => (
                        <li key={i} className="text-[12px]">
                          <button
                            onClick={() => edit(m.step)}
                            className="text-red-200 hover:text-white underline underline-offset-2"
                          >
                            Step {m.step}: {m.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">

          <Section title="Venture" step={1} onEdit={edit}>
            <div className="flex items-start gap-4">
              {v.logo_url && (
                <img src={v.logo_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-[16px] font-bold text-white">{v.name}</h4>
                {v.tagline && <p className="text-[13px] text-zinc-400 mt-0.5">{v.tagline}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {v.stage && <Chip label={v.stage} />}
                  {v.industry && <Chip label={v.industry} />}
                  {v.sub_category && <Chip label={v.sub_category} />}
                </div>
              </div>
            </div>
            {v.description && (
              <Field label="What you're building" value={v.description} />
            )}
          </Section>

          <Section title="The Problem" step={2} onEdit={edit}>
            <Field label="Problem" value={s.step2_problem?.problem_statement} />
            <Field label="Affected audience" value={s.step2_problem?.affected_audience} />
            <Field label="Context" value={s.step2_problem?.problem_context} />
            {s.step2_problem?.impact_tags?.length > 0 && (
              <div>
                <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">Impact</p>
                <div className="flex flex-wrap gap-1">
                  {s.step2_problem.impact_tags.map((t: string) => <Chip key={t} label={t.replace(/_/g, ' ')} />)}
                </div>
              </div>
            )}
          </Section>

          <Section title="The Insight" step={3} onEdit={edit}>
            <Field label="Why worth solving" value={s.step3_insight?.why_worth_solving} />
            <Field label="Overlooked understanding" value={s.step3_insight?.overlooked_understanding} />
          </Section>

          <Section title="Customer & Alternatives" step={4} onEdit={edit}>
            <Field label="First customer" value={s.step4_customer.profile?.first_customer} />
            <Field label="Why they'd change" value={s.step4_customer.profile?.why_change_behavior} />
            {s.step4_customer.alternatives?.length > 0 && (
              <div>
                <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">
                  Alternatives ({s.step4_customer.alternatives.length})
                </p>
                <div className="space-y-1.5">
                  {s.step4_customer.alternatives.map((a: any) => (
                    <div key={a.id} className="text-[12.5px] text-zinc-300">
                      • <span className="font-semibold text-white">{a.alternative_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          <Section title="The Solution" step={5} onEdit={edit}>
            <Field label="Solution" value={s.step5_solution?.solution_description} />
            <Field label="MVP" value={s.step5_solution?.mvp_definition} />
          </Section>

          <Section title="Market" step={6} onEdit={edit}>
            <Field label="Initial market" value={s.step6_market?.initial_market} />
            <Field label="Market size" value={s.step6_market?.market_size_estimate} />
            {s.step6_market?.distribution_channels?.length > 0 && (
              <div>
                <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">Distribution</p>
                <div className="flex flex-wrap gap-1">
                  {s.step6_market.distribution_channels.map((c: string) =>
                    <Chip key={c} label={c.replace(/_/g, ' ')} />
                  )}
                </div>
              </div>
            )}
          </Section>

          <Section title="Competition" step={7} onEdit={edit}>
            {s.step7_competition.competitors?.length > 0 ? (
              <div>
                <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">
                  Competitors ({s.step7_competition.competitors.length})
                </p>
                <div className="space-y-1.5">
                  {s.step7_competition.competitors.map((c: any) => (
                    <div key={c.id} className="text-[12.5px] text-zinc-300">
                      • <span className="font-semibold text-white">{c.competitor_name}</span>
                      <span className="text-zinc-500"> · {c.competitor_type.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[12.5px] text-zinc-500 italic">No competitors added.</p>
            )}
            <Field label="Why choose us" value={s.step7_competition.differentiation?.why_choose_us} />
            <Field label="Why reject us" value={s.step7_competition.differentiation?.why_reject_us} />
          </Section>

          <Section title="Founder & Team" step={8} onEdit={edit}>
            <Field label="Why solve this" value={s.step8_founder_team.founder_answers?.why_solve_this} />
            <Field label="Founder advantage" value={s.step8_founder_team.founder_answers?.founder_advantage} />
            <Field label="Critical gap" value={s.step8_founder_team.capabilities?.most_critical_gap} />
          </Section>

          <Section title="Reality Check" step={9} onEdit={edit}>
            {s.step9_reality_check.assumptions?.length > 0 && (
              <div>
                <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">
                  Assumptions ({s.step9_reality_check.assumptions.length})
                </p>
                <div className="space-y-1.5">
                  {s.step9_reality_check.assumptions.map((a: any) => (
                    <div key={a.id} className="text-[12.5px] text-zinc-300">
                      • {a.assumption_text}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Field label="Biggest risk" value={s.step9_reality_check.risks?.biggest_risk} />
          </Section>

          <Section title="Next Move" step={10} onEdit={edit}>
            <Field label="Most important proof" value={s.step10_next_move.next_move?.most_important_proof} />
            <Field label="30-day focus" value={s.step10_next_move.next_move?.thirty_day_focus} />
            {s.step10_next_move.milestones?.length > 0 && (
              <div>
                <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">
                  Milestones ({s.step10_next_move.milestones.length})
                </p>
                <div className="space-y-1.5">
                  {s.step10_next_move.milestones.map((m: any) => (
                    <div key={m.id} className="text-[12.5px] text-zinc-300">
                      • <span className="font-semibold text-white">{m.title}</span>
                      {m.target_date && (
                        <span className="text-zinc-500"> · {new Date(m.target_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* Publish CTA */}
        <div className="mt-10 rounded-2xl border border-zinc-800 bg-[#121215] p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-white/5 border border-zinc-800 flex items-center justify-center flex-shrink-0">
              <CheckCircle size={14} weight="fill" className="text-zinc-300" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-white">Ready to publish?</h3>
              <p className="text-[12.5px] text-zinc-400 mt-1 leading-relaxed">
                Once published, your venture becomes visible on DSRT Connect with the
                Verified Assessment badge. You can continue editing everything from
                the venture page.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <button
              onClick={() => goToStep(1)}
              disabled={publishing}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg border border-zinc-800 hover:border-zinc-600 text-[13px] font-semibold text-zinc-200 hover:text-white transition-colors disabled:opacity-50"
            >
              Back to steps
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-lg bg-white text-black hover:bg-zinc-100 text-[13.5px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {publishing ? (
                <><CircleNotch size={13} className="animate-spin" /> Publishing…</>
              ) : (
                <>
                  <CheckCircle size={14} weight="fill" />
                  Create & publish venture
                  <ArrowRight size={13} weight="bold" />
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-6 max-w-lg mx-auto">
          <AssessmentTipsCard label="What happens next">
            <p>
              Publishing creates an atomic transaction: your canonical data is
              locked, the venture page becomes live, and Explore begins matching
              you with the right people.
            </p>
          </AssessmentTipsCard>
        </div>
      </div>
    </div>
  )
}

// ─── Small building blocks ────────────────────────────────────────

function Section({
  title, step, onEdit, children
}: {
  title: string; step: number; onEdit: (step: number) => void; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#121215] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-semibold">
            Step {step}
          </span>
          <span className="text-zinc-700">·</span>
          <h3 className="text-[15px] font-bold text-white">{title}</h3>
        </div>
        <button
          onClick={() => onEdit(step)}
          className="inline-flex items-center gap-1 h-7 px-2 text-[11.5px] font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <PencilSimple size={11} /> Edit
        </button>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value || value.trim() === '') {
    return (
      <div>
        <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">{label}</p>
        <p className="text-[12.5px] text-zinc-600 italic">Not provided</p>
      </div>
    )
  }
  return (
    <div>
      <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">{label}</p>
      <p className="text-[13px] text-zinc-200 leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  )
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center h-6 px-2 rounded bg-white/[0.06] border border-zinc-800 text-[11px] font-medium text-zinc-300 capitalize">
      {label}
    </span>
  )
}