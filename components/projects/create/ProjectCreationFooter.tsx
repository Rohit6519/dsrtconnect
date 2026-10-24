// components/projects/create/ProjectCreationFooter.tsx
'use client'

import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProjectStepKey } from '@/stores/projectCreationStore'

interface Props {
  currentStep: ProjectStepKey
  isSaving?: boolean
  canContinue: boolean
  onBack: () => void
  onContinue: () => void
  onPublish?: () => void
}

export function ProjectCreationFooter({
  currentStep,
  isSaving = false,
  canContinue,
  onBack,
  onContinue,
  onPublish,
}: Props) {
  const isFirst = currentStep === 'identity'
  const isLast = currentStep === 'publish'

  return (
    <div className="flex items-center justify-between gap-3 pt-8 mt-8 border-t border-white/[0.06]">
      <div>
        {!isFirst && (
          <button
            type="button"
            onClick={onBack}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/[0.04] transition-all disabled:opacity-40"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isLast ? (
          <button
            type="button"
            onClick={onPublish}
            disabled={!canContinue || isSaving}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 h-9 px-6 rounded-md text-[13px] font-semibold transition-all min-w-[130px]",
              "bg-white text-black hover:bg-white/90",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Publish Project'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onContinue}
            disabled={!canContinue || isSaving}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 h-9 px-5 rounded-md text-[13px] font-semibold transition-all min-w-[110px]",
              "bg-white text-black hover:bg-white/90",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}