// filepath: components/looking-for/studio/StudioStepNav.tsx
'use client'

import { Check } from '@phosphor-icons/react'
import type { StudioStep } from './StudioContext'
import { useStudio } from './StudioContext'
import { cn } from '@/lib/utils'

const STEPS: { key: StudioStep; label: string; index: number }[] = [
  { key: 'basics', label: 'Basics', index: 1 },
  { key: 'details', label: 'Details', index: 2 },
  { key: 'requirements', label: 'Requirements', index: 3 },
  { key: 'application', label: 'Application', index: 4 },
  { key: 'workflow', label: 'Workflow', index: 5 },
  { key: 'distribution', label: 'Distribution', index: 6 },
  { key: 'review', label: 'Review', index: 7 },
]

export function StudioStepNav({ active, onChange }: { active: StudioStep; onChange: (s: StudioStep) => void }) {
  const { draft } = useStudio()

  const isComplete = (step: StudioStep): boolean => {
    const o = draft.opportunity
    switch (step) {
      case 'basics':
        return !!o.title && o.title !== 'Untitled opportunity' && !!o.opportunity_type
      case 'details':
        return !!(o.description || o.content_text)
      case 'requirements': {
        const hasSkills = (draft.skill_requirements || []).length > 0
        const hasComp = !!o.compensation_type
        const hasMode = !!o.work_mode
        return hasSkills && hasComp && hasMode
      }
      case 'application':
      case 'workflow':
      case 'distribution':
        return true
      case 'review':
        return o.status !== 'draft'
      default:
        return false
    }
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
      {STEPS.map((s) => {
        const isActive = active === s.key
        const complete = isComplete(s.key)
        return (
          <button
            key={s.key}
            onClick={() => onChange(s.key)}
            className={cn(
              'relative flex items-center gap-2 py-2 px-3 rounded-lg text-[12.5px] font-semibold whitespace-nowrap transition-all shrink-0',
              isActive ? 'text-white' : 'text-white/45 hover:text-white/80'
            )}
          >
            <span
              className={cn(
                'inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10.5px] font-bold transition-all border shrink-0',
                isActive
                  ? 'bg-white text-black border-white shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.6)]'
                  : complete
                    ? 'bg-gradient-to-b from-[#1A1D28] to-[#0E1119] text-emerald-400/85 border-emerald-400/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                    : 'bg-gradient-to-b from-[#12141C] to-[#08090F] text-white/40 border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
              )}
            >
              {complete && !isActive ? <Check size={11} weight="bold" /> : s.index}
            </span>
            {s.label}
            {isActive && (
              <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-t-full bg-white shadow-[0_-1px_10px_rgba(255,255,255,0.35)]" />
            )}
          </button>
        )
      })}
    </div>
  )
}