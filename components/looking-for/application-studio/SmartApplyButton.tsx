'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PaperPlaneTilt,
  CheckCircle,
  LockKey,
  PencilSimple,
  CircleNotch,
  ArrowRight,
} from '@phosphor-icons/react'
import { ApplicationBriefModal } from './ApplicationBriefModal'
import { cn } from '@/lib/utils'

export function SmartApplyButton({
  opportunity,
  isOwner,
  isClosed,
  className,
}: {
  opportunity: any
  isOwner: boolean
  isClosed: boolean
  className?: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [showBrief, setShowBrief] = useState(false)

  const app = opportunity.application
  const stage = app?.pipeline_stage

  const isDraft = stage === 'draft'
  const isWithdrawn = stage === 'withdrawn'
  const isSubmitted = !!app && stage !== 'draft' && stage !== 'withdrawn'

  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold transition-all whitespace-nowrap disabled:opacity-60 select-none'

  const sizeDefault = 'h-11 px-5'

  const handleApplyClick = () => {
    if (isDraft && app?.id) {
      setBusy(true)
      router.push(`/looking-for/${opportunity.id}/apply/${app.id}`)
      return
    }
    setShowBrief(true)
  }

  if (isOwner) {
    return (
      <button
        onClick={() => router.push(`/looking-for/create-v2/${opportunity.id}`)}
        className={cn(
          base,
          className || `${sizeDefault} w-full`,
          'bg-white/[0.04] border border-white/[0.1] text-white/80 hover:text-white hover:bg-white/[0.08]'
        )}
      >
        <PencilSimple size={14} /> Edit Opportunity
      </button>
    )
  }

  if (isSubmitted) {
    return (
      <button
        onClick={() => router.push(`/looking-for/my-applications?app=${app.id}`)}
        className={cn(
          base,
          className || `${sizeDefault} w-full`,
          'border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15'
        )}
      >
        <CheckCircle size={14} weight="fill" />
        <span className="truncate">Application Submitted</span>
        <ArrowRight size={11} weight="bold" />
      </button>
    )
  }

  if (isClosed) {
    return (
      <button
        disabled
        className={cn(
          base,
          className || `${sizeDefault} w-full`,
          'bg-white/[0.02] border border-white/[0.08] text-white/40 cursor-not-allowed'
        )}
      >
        <LockKey size={13} weight="fill" /> Applications Closed
      </button>
    )
  }

  if (isDraft) {
    return (
      <button
        onClick={handleApplyClick}
        disabled={busy}
        className={cn(
          base,
          className || `${sizeDefault} w-full`,
          'bg-gradient-to-b from-[#1e3a5f] to-[#2c5282] text-white border border-[#2c5282]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:from-[#25467a] hover:to-[#345d94]'
        )}
      >
        {busy ? (
          <CircleNotch size={13} className="animate-spin" />
        ) : (
          <PencilSimple size={13} weight="bold" />
        )}
        <span className="truncate">Continue Application</span>
      </button>
    )
  }

  return (
    <>
      <button
        onClick={handleApplyClick}
        disabled={busy}
        className={cn(
          base,
          className || `${sizeDefault} w-full`,
          'bg-white text-black hover:bg-zinc-200 border border-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.7)] active:scale-[0.98]'
        )}
      >
        {busy ? (
          <CircleNotch size={13} className="animate-spin" />
        ) : (
          <PaperPlaneTilt size={13} weight="bold" />
        )}
        {isWithdrawn ? 'Apply Again' : 'Apply Now'}
      </button>

      {showBrief && (
        <ApplicationBriefModal
          opportunityId={opportunity.id}
          onClose={() => setShowBrief(false)}
        />
      )}
    </>
  )
}