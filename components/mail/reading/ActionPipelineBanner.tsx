'use client'

import { useState } from 'react'
import { 
  Check, X as XIcon, Handshake, Briefcase, Buildings, 
  CheckCircle, XCircle, Rocket 
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  threadId: string
  sourceType: string
  actionState: string | null
  onActionComplete: () => void
}

const SOURCE_CONFIG: Record<string, { 
  icon: any
  label: string
  description: string
  acceptLabel: string
  color: string
  bg: string
  border: string
}> = {
  connect: {
    icon: Handshake,
    label: 'Connection request',
    description: 'Accepting will add this person to your DSRT connections.',
    acceptLabel: 'Accept & connect',
    color: 'text-blue-300',
    bg: 'bg-blue-500/[0.06]',
    border: 'border-blue-500/20',
  },
  application: {
    icon: Briefcase,
    label: 'Application',
    description: 'Review and respond to this application.',
    acceptLabel: 'Accept application',
    color: 'text-violet-300',
    bg: 'bg-violet-500/[0.06]',
    border: 'border-violet-500/20',
  },
  venture_invite: {
    icon: Buildings,
    label: 'Venture invitation',
    description: 'Accept to join this venture team.',
    acceptLabel: 'Accept invitation',
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/[0.06]',
    border: 'border-emerald-500/20',
  },
  project_invite: {
    icon: Rocket,
    label: 'Project invitation',
    description: 'Accept to join this project team.',
    acceptLabel: 'Accept invitation',
    color: 'text-amber-300',
    bg: 'bg-amber-500/[0.06]',
    border: 'border-amber-500/20',
  },
}

export function ActionPipelineBanner({ 
  threadId, sourceType, actionState, onActionComplete 
}: Props) {
  const [loading, setLoading] = useState(false)
  const config = SOURCE_CONFIG[sourceType]
  if (!config) return null

  const handleAction = async (action: 'accepted' | 'declined') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/mail/threads/${threadId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(action === 'accepted' ? 'Accepted' : 'Declined')
      onActionComplete()
    } catch (e: any) {
      toast.error(e.message || 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  const Icon = config.icon

  // Already responded state
  if (actionState) {
    const isAccepted = actionState === 'accepted'
    return (
      <div className={cn(
        "flex items-center gap-3 p-4 rounded-xl border",
        isAccepted
          ? "bg-emerald-500/[0.06] border-emerald-500/20"
          : "bg-red-500/[0.06] border-red-500/20"
      )}>
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
          isAccepted ? "bg-emerald-500/15" : "bg-red-500/15"
        )}>
          {isAccepted ? (
            <CheckCircle className="w-5 h-5 text-emerald-300" weight="fill" />
          ) : (
            <XCircle className="w-5 h-5 text-red-300" weight="fill" />
          )}
        </div>
        <div className="flex-1">
          <p className={cn(
            "text-[13px] font-bold tracking-tight",
            isAccepted ? "text-emerald-300" : "text-red-300"
          )}>
            {isAccepted ? 'Request accepted' : 'Request declined'}
          </p>
          <p className="text-[11.5px] text-white/50 mt-0.5">
            You responded to this {config.label.toLowerCase()}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex items-center gap-4 p-4 rounded-xl border",
      config.bg, config.border
    )}>
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border",
        config.bg, config.border
      )}>
        <Icon className={cn("w-5 h-5", config.color)} weight="fill" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-white tracking-tight">{config.label}</p>
        <p className="text-[11.5px] text-white/55 mt-0.5">{config.description}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => handleAction('declined')}
          disabled={loading}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white text-[12px] font-bold transition-colors disabled:opacity-40"
        >
          <XIcon className="w-3 h-3" weight="bold" />
          Decline
        </button>
        <button
          onClick={() => handleAction('accepted')}
          disabled={loading}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white text-black hover:bg-zinc-200 text-[12px] font-bold transition-colors disabled:opacity-40"
        >
          <Check className="w-3 h-3" weight="bold" />
          {config.acceptLabel}
        </button>
      </div>
    </div>
  )
}