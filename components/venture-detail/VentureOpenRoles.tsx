'use client'

import { Briefcase, MapPin, Clock, CurrencyDollar, Plus, ArrowRight, Lightning } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Props {
  venture: any
  roles: any[]
  slug: string
  isOwner: boolean
}

export function VentureOpenRoles({ venture, roles, slug, isOwner }: Props) {
  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-[19px] font-bold text-white">Open Roles</h2>
          <p className="text-[12.5px] text-white/45 mt-0.5">
            {roles.length > 0 ? roles.length + ' open position' + (roles.length !== 1 ? 's' : '') : 'No open positions'}
          </p>
        </div>
        {isOwner && (
          <button className="text-[12.5px] font-semibold text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] px-3.5 h-9 rounded-lg flex items-center gap-1.5">
            <Plus size={13} weight="bold" /> Post Role
          </button>
        )}
      </div>

      {roles.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl py-16 text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/5 border border-white/[0.06] items-center justify-center mb-4">
            <Briefcase size={26} className="text-white/40" />
          </div>
          <p className="text-[15px] font-semibold text-white">No open roles</p>
          <p className="text-[12.5px] text-white/45 mt-1 max-w-sm mx-auto">
            {isOwner ? 'Post roles to attract co-founders, engineers, designers, and more.' : 'This venture isn\'t hiring right now.'}
          </p>
          {isOwner && (
            <button className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold bg-white text-black hover:bg-white/90 px-4 h-9 rounded-lg">
              <Plus size={12} weight="bold" /> Post first role
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map(r => <RoleCard key={r.id} role={r} isOwner={isOwner} />)}
        </div>
      )}
    </div>
  )
}

function RoleCard({ role, isOwner }: { role: any; isOwner: boolean }) {
  const isUrgent = role.urgency === 'urgent'

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.15] rounded-2xl overflow-hidden transition-all group">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-[16px] font-bold text-white">{role.title}</h3>
              {isUrgent && (
                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-300">
                  <Lightning size={9} weight="fill" /> Urgent
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-white/50">
              {role.type && <span className="capitalize">{role.type}</span>}
              {role.location_type && <span className="flex items-center gap-1"><MapPin size={11} weight="fill" /> {role.location_type}</span>}
              {role.commitment && <span className="flex items-center gap-1"><Clock size={11} weight="fill" /> {role.commitment}</span>}
              {role.compensation && <span className="flex items-center gap-1"><CurrencyDollar size={11} weight="fill" /> {role.compensation}</span>}
            </div>
          </div>
          <button className="flex-shrink-0 flex items-center gap-1.5 text-[12px] font-semibold text-white bg-white/[0.06] hover:bg-white hover:text-black border border-white/[0.08] px-3.5 h-9 rounded-lg transition-colors">
            Apply <ArrowRight size={11} weight="bold" />
          </button>
        </div>

        {role.description && (
          <p className="text-[12.5px] text-white/70 leading-relaxed mt-3 line-clamp-3">{role.description}</p>
        )}

        {role.skills && role.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {role.skills.slice(0, 6).map((s: string) => (
              <span key={s} className="text-[10.5px] font-medium text-white/70 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded">
                {s}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.06] text-[10.5px] text-white/40">
          <span>{role.application_count || 0} applicants</span>
          <span>·</span>
          <span>Posted {new Date(role.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>
    </div>
  )
}
