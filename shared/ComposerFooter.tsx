'use client'

import { CaretLeft, CaretRight, PaperPlaneTilt, CircleNotch } from '@phosphor-icons/react'

interface Props {
  onBack?: () => void
  onNext?: () => void
  onSend?: () => void
  nextDisabled?: boolean
  isLastStep?: boolean
  sending?: boolean
  nextLabel?: string
}

export function ComposerFooter({
  onBack, onNext, onSend, nextDisabled, isLastStep, sending, nextLabel
}: Props) {
  return (
    <div className="border-t border-white/[0.06] px-6 py-4 flex items-center justify-between bg-[#0d0d10]">
      <button
        onClick={onBack}
        disabled={!onBack}
        className={
          'flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-semibold transition-colors ' +
          (onBack
            ? 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            : 'text-zinc-700 cursor-not-allowed')
        }
      >
        <CaretLeft size={13} weight="bold" />
        Back
      </button>

      {isLastStep ? (
        <button
          onClick={onSend}
          disabled={nextDisabled || sending}
          className="inline-flex items-center gap-2 h-9 px-5 rounded-lg bg-white text-black text-[12.5px] font-bold hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {sending ? (
            <><CircleNotch size={13} className="animate-spin" /> Sending…</>
          ) : (
            <><PaperPlaneTilt size={13} weight="fill" /> Send Invitation</>
          )}
        </button>
      ) : (
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white text-black text-[12.5px] font-bold hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {nextLabel || 'Continue'}
          <CaretRight size={13} weight="bold" />
        </button>
      )}
    </div>
  )
}