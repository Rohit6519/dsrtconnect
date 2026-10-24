'use client'

import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  canContinue: boolean
  onBack?: () => void
  onContinue: () => void
  onSkip?: () => void
  continueLabel?: string
  isSaving?: boolean
  isFirst?: boolean
  isLast?: boolean
}

export function OnboardingFooter({
  canContinue,
  onBack,
  onContinue,
  onSkip,
  continueLabel = 'Continue',
  isSaving = false,
  isFirst = false,
  isLast = false,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-3 pt-8 mt-8 border-t border-white/[0.06]">
      {/* Back */}
      <div>
        {!isFirst && onBack && (
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

      {/* Skip + Continue */}
      <div className="flex items-center gap-2">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            disabled={isSaving}
            className="h-9 px-4 rounded-md text-[13px] font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all disabled:opacity-40"
          >
            Skip for now
          </button>
        )}
        
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue || isSaving}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 h-9 px-5 rounded-md text-[13px] font-semibold transition-all min-w-[110px]",
            "bg-white text-black hover:bg-white/90",
            "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
          )}
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              {isLast ? continueLabel : continueLabel}
              {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
            </>
          )}
        </button>
      </div>
    </div>
  )
}