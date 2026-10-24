'use client'

import { Check } from 'lucide-react'
import { Lightbulb, ShieldCheck } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { ProjectStepKey } from '@/stores/projectCreationStore'

export interface ProjectStepConfig {
  key: ProjectStepKey
  number: number
  title: string
  desc: string
}

export const PROJECT_STEPS: ProjectStepConfig[] = [
  { key: 'identity', number: 1, title: 'Identity', desc: 'Name, type, and visuals' },
  { key: 'definition', number: 2, title: 'Definition', desc: 'About, problem, and domains' },
  { key: 'build', number: 3, title: 'Build', desc: 'Stage, tech stack, and links' },
  { key: 'collaboration', number: 4, title: 'Collaboration', desc: 'Team and open roles' },
  { key: 'publish', number: 5, title: 'Publish', desc: 'Preview and launch' },
]

const STEP_TIPS: Record<ProjectStepKey, { title: string; tips: string[]; usage: string }> = {
  identity: {
    title: 'Tips for project identity',
    tips: [
      'Keep your name short, unique, and easy to remember.',
      'Explain WHAT your project does before explaining HOW it works.',
      'A project cover image increases profile views by up to 3x.',
    ],
    usage: 'Your project identity powers how it appears on the global Explore feed, home feed cards, and search results across DSRT.',
  },
  definition: {
    title: 'Tips for clear definition',
    tips: [
      'Answer three core questions: What are you building? Why does it matter? Who is it for?',
      'Select up to 3 domains from our global taxonomy for exact matching.',
      'You can expand the description anytime inside your Project Workspace.',
    ],
    usage: 'Domains and definitions train the DSRT recommendation engine to connect you with interested builders and relevant opportunities.',
  },
  build: {
    title: 'Tips for build details',
    tips: [
      'Be transparent about your current stage — builders appreciate honesty over hype.',
      'Add key frameworks and tools so developers can evaluate technical fit.',
      'Connecting a repository allows DSRT to display live activity metrics.',
    ],
    usage: 'Your tech stack and stage allow other developers to filter projects in Explore and find repositories matching their skills.',
  },
  collaboration: {
    title: 'Tips for collaboration',
    tips: [
      'Define clear roles if you need specific skills to ship your project.',
      'You can publish as a solo builder and add team members whenever you are ready.',
      'Roles created here automatically publish to DSRT Looking For.',
    ],
    usage: 'Collaboration preferences control whether DSRT members can send contribution requests directly to your Project Workspace.',
  },
  publish: {
    title: 'Tips before launching',
    tips: [
      'Review your card preview to ensure typography and images look balanced.',
      'Public projects become discoverable by all DSRT members immediately.',
      'You can change visibility or edit any detail from Project Settings anytime.',
    ],
    usage: 'Publishing registers your canonical DSRT project ID and broadcasts a launch signal to the global builder network.',
  },
}

interface Props {
  currentStep: ProjectStepKey
  completedSteps: Record<ProjectStepKey, boolean>
  canNavigateToStep: (step: ProjectStepKey) => boolean
  onStepClick: (step: ProjectStepKey) => void
}

export function ProjectCreationSidebar({
  currentStep,
  completedSteps,
  canNavigateToStep,
  onStepClick,
}: Props) {
  const currentTips = STEP_TIPS[currentStep]

  return (
    <aside className="w-full lg:w-[320px] lg:flex-shrink-0">
      <div className="lg:sticky lg:top-24 space-y-6">
        
        {/* Dynamic Setup Steps Timeline */}
        <div>
          <p className="text-[11px] font-bold text-white/40 tracking-widest uppercase mb-4 px-1">
            Project Setup
          </p>

          <nav className="space-y-2.5">
            {PROJECT_STEPS.map((step) => {
              const isCurrent = currentStep === step.key
              const isCompleted = completedSteps[step.key]
              const isClickable = canNavigateToStep(step.key)
              
              // Now ACTIVE and COMPLETED steps both get the solid blue treatment
              const isSolidBlue = isCurrent || isCompleted

              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => isClickable && onStepClick(step.key)}
                  disabled={!isClickable}
                  className={cn(
                    'w-full flex items-start gap-3.5 p-3.5 rounded-2xl text-left transition-all duration-300 relative overflow-hidden',
                    
                    /* SOLID BLUE GRADIENT CARD (ACTIVE OR COMPLETED) */
                    isSolidBlue && 'bg-gradient-to-br from-[#38bdf8] to-[#2563eb] text-[#05070D] shadow-[0_8px_24px_rgba(56,189,248,0.25)] border border-white/30',
                    
                    /* INCOMPLETE & UNVISITED STEP (DARK CARD) */
                    !isSolidBlue && isClickable && 'bg-[#0A0A0C] border border-white/[0.06] text-white/70 hover:bg-white/[0.04]',
                    
                    /* DISABLED / UNREACHABLE STEP */
                    !isSolidBlue && !isClickable && 'bg-[#0A0A0C]/50 border border-white/[0.03] text-white/30 cursor-not-allowed'
                  )}
                >
                  {/* Inner top glow line for 3D padded depth on solid blue cards */}
                  {isSolidBlue && (
                    <div className="absolute inset-x-0 top-0 h-px bg-white/50 pointer-events-none" />
                  )}

                  <div className="flex-shrink-0 mt-0.5 relative z-10">
                    {isCompleted ? (
                      /* Completed Checkmark Badge */
                      <div className="w-6 h-6 rounded-lg bg-[#05070D] text-[#38bdf8] flex items-center justify-center font-bold shadow-sm">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : isCurrent ? (
                      /* Active Step Badge */
                      <div className="w-6 h-6 rounded-lg bg-[#05070D] text-white flex items-center justify-center font-black text-[11px] shadow-sm">
                        {step.number}
                      </div>
                    ) : (
                      /* Pending Step Badge */
                      <div className="w-6 h-6 rounded-lg border border-white/20 flex items-center justify-center text-white/40 font-mono text-[11px]">
                        {step.number}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 relative z-10">
                    <div
                      className={cn(
                        'text-[13.5px] leading-tight transition-colors',
                        isSolidBlue ? 'font-extrabold text-[#05070D]' : 'font-semibold text-white/60'
                      )}
                    >
                      {step.title}
                    </div>
                    <div
                      className={cn(
                        'text-[11.5px] mt-1 leading-tight font-medium',
                        isSolidBlue ? 'text-[#05070D]/80 font-semibold' : 'text-zinc-500'
                      )}
                    >
                      {step.desc}
                    </div>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tips Box — Solid Blue Gradient Padded */}
        <div className="relative p-5 rounded-2xl bg-gradient-to-br from-[#38bdf8] to-[#2563eb] shadow-[0_8px_30px_rgba(59,130,246,0.15)] overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-white/40 pointer-events-none" />

          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-black/10 flex items-center justify-center border border-black/5 shadow-inner">
              <Lightbulb size={16} weight="fill" className="text-[#05070D]" />
            </div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-[#05070D] font-bold">
              {currentTips.title}
            </p>
          </div>

          <ul className="space-y-2.5">
            {currentTips.tips.map((tip, idx) => (
              <li key={idx} className="text-[12.5px] text-[#05070D]/90 leading-relaxed flex gap-2 font-semibold">
                <span className="text-[#05070D]/50 flex-shrink-0 font-bold">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* How We Use This Box — Solid Blue Gradient Padded */}
        <div className="relative p-5 rounded-2xl bg-gradient-to-br from-[#38bdf8] to-[#2563eb] shadow-[0_8px_30px_rgba(59,130,246,0.15)] overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-white/40 pointer-events-none" />

          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-black/10 flex items-center justify-center border border-black/5 shadow-inner">
              <ShieldCheck size={16} weight="fill" className="text-[#05070D]" />
            </div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-[#05070D] font-bold">
              How we use this
            </p>
          </div>

          <p className="text-[12.5px] text-[#05070D]/90 leading-relaxed font-semibold">
            {currentTips.usage}
          </p>
        </div>

      </div>
    </aside>
  )
}