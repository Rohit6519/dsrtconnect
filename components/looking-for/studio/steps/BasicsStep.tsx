// filepath: components/looking-for/studio/steps/BasicsStep.tsx
'use client'

import { useStudio } from '../StudioContext'
import { StepFooter } from './StepFooter'
import { CategoryPicker } from './parts/CategoryPicker'
import { ContextPicker } from './parts/ContextPicker'
import { TitleInput } from './parts/TitleInput'
import { InfoTooltip } from './parts/InfoTooltip'
import { TipBox } from './parts/TipBox'
import { Briefcase, Rocket, Users, Wrench, Handshake, BookOpen, CurrencyDollar, CodeBlock } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

const TYPES = [
  { id: 'hire', label: 'Hire', desc: 'Full-time, part-time or contract', icon: Briefcase },
  { id: 'freelance', label: 'Freelance', desc: 'Short-term or project-based', icon: Wrench },
  { id: 'cofounder', label: 'Co-founder', desc: 'Start a new venture together', icon: Rocket },
  { id: 'team-up', label: 'Team Up', desc: 'Find collaborators for an idea', icon: Users },
  { id: 'mentorship', label: 'Mentorship', desc: 'Find or offer guidance', icon: BookOpen },
  { id: 'open-source', label: 'Open Source', desc: 'Contributors for OSS', icon: CodeBlock },
  { id: 'bounty', label: 'Bounty', desc: 'Reward for specific tasks', icon: CurrencyDollar },
  { id: 'consulting', label: 'Consulting', desc: 'Expert advisory services', icon: Handshake },
]

export function BasicsStep() {
  const { draft, updateField } = useStudio()
  const opp = draft.opportunity

  return (
    <>
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8">
        <div className="space-y-6 min-w-0">
          <div>
            <h2 className="text-[24px] font-bold text-white mb-1.5 tracking-tight">Basics</h2>
            <p className="text-[13px] text-white/50 leading-relaxed">
              Define the core identity of this opportunity. What is it, and who is it for?
            </p>
          </div>

          <div className="space-y-5">
            <Field label="What are you looking for?" tooltip="This sets the primary icon and defaults for your opportunity card across DSRT." required>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TYPES.map(t => (
                  <TypeCard key={t.id} type={t} active={opp.opportunity_type === t.id} onClick={() => updateField({ opportunity_type: t.id })} />
                ))}
              </div>
            </Field>

            <Field label="Opportunity Title" tooltip="A clear, standard title performs best in search." required>
              <TitleInput 
                value={opp.title || ''} 
                onChange={(v) => updateField({ title: v })} 
              />
            </Field>

            <Field label="Short Subtitle" tooltip="A one-sentence hook that appears on the feed card before users click in.">
              <div className="relative">
                <textarea
                  value={opp.subtitle || ''}
                  onChange={(e) => updateField({ subtitle: e.target.value.slice(0, 200) })}
                  placeholder="A concise, one-sentence hook summarizing the role or project..."
                  rows={2}
                  className="w-full py-3 px-4 rounded-xl bg-[#0A0C13] border border-white/[0.07] text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/[0.2] focus:bg-[#0B0E17] resize-none transition-all leading-relaxed shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
                />
                <span className="absolute right-3 bottom-3 text-[10.5px] text-white/35 font-mono pointer-events-none">
                  {opp.subtitle?.length || 0}/200
                </span>
              </div>
            </Field>

            <Field label="Category" tooltip="Helps the DSRT recommendation engine match this opportunity to the right builders." required>
              <CategoryPicker />
            </Field>

            <Field label="Associated Context" tooltip="Link this opportunity to a Venture or Project you own.">
              <p className="text-[12px] text-white/50 mb-3 leading-relaxed">
                Is this a personal request, or are you hiring on behalf of a specific Project, Venture, or Community?
              </p>
              <ContextPicker />
            </Field>
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-[130px] space-y-4">
            <TipBox
              variant="tips"
              items={[
                { title: 'Be specific in titles', desc: 'Titles like "Need a dev" perform poorly. "React Native Developer for Fintech app" gets 4x more clicks.' },
                { title: 'Use subcategories', desc: 'Selecting a subcategory improves your match rate in the recommendation engine.' },
                { title: 'Link to projects', desc: 'Opportunities linked to a Venture or Project automatically appear on those pages.' },
              ]}
            />
            <TipBox variant="privacy">
              Your title, subtitle, and category are used to generate personalized recommendations for other DSRT builders. Only public fields are indexed.
            </TipBox>
          </div>
        </div>
      </div>

      <StepFooter next="details" />
    </>
  )
}

function Field({ label, tooltip, required, children }: { label: string; tooltip?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#12141C] via-[#0D0F16] to-[#0A0C13] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_24px_rgba(0,0,0,0.4)]">
      <label className="flex items-center flex-wrap gap-2 text-[13px] font-bold text-white mb-4">
        <span className="flex items-center">
          {label}
          {tooltip && <InfoTooltip text={tooltip} />}
        </span>
        {required && (
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-white/70 bg-white/[0.06] border border-white/[0.1] px-1.5 py-0.5 rounded shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            Required
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

function TypeCard({ type, active, onClick }: { type: any; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-2 p-3.5 rounded-xl border text-left transition-all relative overflow-hidden',
        active
          ? 'border-white/25 bg-gradient-to-b from-[#1A1D28] via-[#141721] to-[#0E1119] shadow-[0_6px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]'
          : 'border-white/[0.06] bg-gradient-to-b from-[#12141C] to-[#08090F] hover:from-[#161821] hover:border-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_2px_8px_rgba(0,0,0,0.25)]'
      )}
    >
      {active && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      )}
      <type.icon 
        size={20} 
        weight={active ? 'fill' : 'regular'} 
        className={active ? 'text-white' : 'text-white/45'} 
      />
      <div>
        <div className={cn('text-[13px] font-bold', active ? 'text-white' : 'text-white/85')}>
          {type.label}
        </div>
        <div className={cn('text-[10.5px] mt-0.5 leading-snug', active ? 'text-white/55' : 'text-white/40')}>
          {type.desc}
        </div>
      </div>
    </button>
  )
}