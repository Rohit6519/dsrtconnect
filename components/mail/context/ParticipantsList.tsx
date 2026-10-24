'use client'

import { User, Rocket, Buildings } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

const ENTITY_META = {
  user: { icon: User, color: 'text-blue-400' },
  venture: { icon: Buildings, color: 'text-violet-400' },
  project: { icon: Rocket, color: 'text-emerald-400' },
}

interface Props {
  participants: any[]
}

export function ParticipantsList({ participants }: Props) {
  const uniqueByIdentity = Array.from(new Map(participants.map(p => [p.identity_id, p])).values())

  return (
    <div>
      <p className="text-[9.5px] uppercase tracking-wider font-bold text-white/40 mb-2">
        Participants ({uniqueByIdentity.length})
      </p>
      <div className="space-y-1">
        {uniqueByIdentity.map(p => {
          const identity = p.identity
          if (!identity) return null
          const meta = ENTITY_META[identity.entity_type as keyof typeof ENTITY_META] || ENTITY_META.user
          const Icon = meta.icon
          return (
            <div key={p.identity_id} className="flex items-center gap-2.5 p-2 rounded-lg">
              <div className="w-7 h-7 rounded-md overflow-hidden bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                {identity.avatar_url ? (
                  <img src={identity.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Icon className={cn("w-3.5 h-3.5", meta.color)} weight="fill" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11.5px] font-bold text-white truncate">{identity.display_name}</p>
                <p className="text-[9.5px] text-white/45 truncate font-mono">{identity.dsrt_email}</p>
              </div>
              <span className="text-[9px] text-white/40 uppercase tracking-wider font-semibold">
                {p.role}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}