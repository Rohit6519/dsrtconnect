// filepath: components/looking-for/studio/steps/ReviewStep.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Rocket, Eye, CircleNotch } from '@phosphor-icons/react'
import { StepFooter } from './StepFooter'
import { useStudio } from '../StudioContext'
import { CompletionChecklist } from './parts/CompletionChecklist'
import { StudioPreview } from './parts/StudioPreview'
import { TipBox } from './parts/TipBox'

export function ReviewStep() {
  const { draft, setStep, flushSave } = useStudio()
  const router = useRouter()
  const oppId = draft.opportunity.id
  const [publishing, setPublishing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [errors, setErrors] = useState<any[] | null>(null)

  const handlePublish = async () => {
    setPublishing(true)
    setErrors(null)
    try {
      await flushSave()
      const res = await fetch(`/api/opportunities/drafts/${oppId}/publish`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) {
        if (d.errors && Array.isArray(d.errors)) {
          setErrors(d.errors)
        } else {
          alert(d.error || 'Publish failed')
        }
        setPublishing(false)
        return
      }
      router.push(`/looking-for/${d.slug || d.opportunity_id}`)
    } catch (e: any) {
      alert(e?.message || 'Publish failed')
      setPublishing(false)
    }
  }

  return (
    <>
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8">
        <div className="space-y-5 min-w-0">
          <div>
            <h2 className="text-[24px] font-bold text-white mb-1.5 tracking-tight">Review & Publish</h2>
            <p className="text-[13px] text-white/50">
              Verify everything, preview the public page, and publish.
            </p>
          </div>

          <CompletionChecklist onJumpTo={setStep} />

          {errors && errors.length > 0 && (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.05] p-5">
              <div className="text-[13px] font-bold text-red-200 mb-2">Publish blocked. Fix these first:</div>
              <ul className="space-y-1.5">
                {errors.map((err: any, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-[12.5px] text-red-300">
                    <span className="w-1 h-1 rounded-full bg-red-400" />
                    <span>{err.message}</span>
                    <button
                      onClick={() => setStep(err.step)}
                      className="text-red-200 hover:text-white underline underline-offset-2 text-[11.5px]"
                    >
                      Go →
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Publish card */}
          <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#12141C] via-[#0D0F16] to-[#0A0C13] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_24px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-[13px] font-bold text-white mb-1">Ready to launch?</div>
                <div className="text-[11.5px] text-white/45">
                  Publishing makes this opportunity live on DSRT immediately.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  disabled={publishing}
                  className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl border border-white/[0.08] hover:border-white/[0.18] bg-gradient-to-b from-white/[0.04] to-white/[0.01] hover:from-white/[0.08] hover:to-white/[0.03] text-[13px] font-semibold text-white/75 hover:text-white transition-all disabled:opacity-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                >
                  <Eye size={13} weight="regular" />
                  Preview
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing}
                  className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-white text-black hover:bg-zinc-100 text-[13px] font-bold shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.5)] disabled:opacity-60 transition-all"
                >
                  {publishing ? (
                    <>
                      <CircleNotch size={13} className="animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Rocket size={13} weight="fill" />
                      Publish Opportunity
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-[130px] space-y-4">
            <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#12141C] via-[#0D0F16] to-[#0A0C13] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_20px_rgba(0,0,0,0.3)]">
              <h3 className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/45 mb-4">
                What happens next
              </h3>
              <ol className="space-y-3">
                <StepInfo n={1} title="Instant publish" desc="Opportunity goes live and appears in enabled surfaces." />
                <StepInfo n={2} title="Search indexing" desc="Users can find it in DSRT search within seconds." />
                <StepInfo n={3} title="Auto recommendations" desc="Matched to relevant users based on skills and interests." />
                <StepInfo n={4} title="You manage from cockpit" desc="Applicants, messages, analytics all in My Opportunities." />
              </ol>
            </div>

            <TipBox
              variant="info"
              title="After publishing"
              items={[
                { title: 'Track applicants', desc: 'View, filter, and message applicants directly from My Opportunities dashboard.' },
                { title: 'Edit anytime', desc: 'Update the opportunity even after publishing. Applicants see the latest version.' },
              ]}
            />
          </div>
        </div>
      </div>

      <StepFooter prev="distribution" />

      {showPreview && <StudioPreview onClose={() => setShowPreview(false)} />}
    </>
  )
}

function StepInfo({ n, title, desc }: { n: number, title: string, desc: string }) {
  return (
    <li className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#1A1D28] to-[#0E1119] border border-white/[0.08] flex items-center justify-center text-[11px] font-bold text-white/60 shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        {n}
      </div>
      <div>
        <div className="text-[12.5px] font-bold text-white/90">{title}</div>
        <div className="text-[11px] text-white/45 mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </li>
  )
}