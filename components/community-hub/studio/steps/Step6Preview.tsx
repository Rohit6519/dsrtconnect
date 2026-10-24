'use client'

import { StudioSectionCard, StudioTipCard } from '../primitives'
import { ShieldCheck, Users, MapPin, Info } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import type { DraftData } from '@/lib/community/service.drafts'

interface Props {
  data: DraftData
}

const POLICY_LABEL: Record<string, string> = {
  OPEN: 'Open to join',
  APPROVAL_REQUIRED: 'Approval required',
  INVITE_ONLY: 'Invite only',
  CLOSED: 'Closed',
}

export function Step6Preview({ data }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <StudioSectionCard title="Preview" description="How your community will appear on DSRT.">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0f] overflow-hidden">
            <div className="relative h-32 md:h-40 bg-gradient-to-br from-white/[0.05] to-transparent">
              {data.cover_url && (
                <img src={data.cover_url} alt="" className="w-full h-full object-cover opacity-80" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            </div>

            <div className="p-5 md:p-6 -mt-10 relative">
              <div className="flex items-end gap-4">
                <div className="w-20 h-20 rounded-2xl border border-white/[0.08] bg-[#0f0f14] overflow-hidden flex items-center justify-center flex-shrink-0">
                  {data.logo_url ? (
                    <img src={data.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[16px] font-semibold text-white/60">
                      {(data.name || '?').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-[20px] font-bold text-white">
                    {data.name || 'Untitled community'}
                  </h2>
                  <ShieldCheck className="w-4 h-4 text-white/40" strokeWidth={1.75} />
                </div>
                <p className="mt-1 text-[11.5px] font-mono uppercase tracking-wider text-white/45">
                  {data.category || 'general'}
                  {data.location_text && (
                    <>
                      <span className="mx-1.5 opacity-40">·</span>
                      {data.location_text}
                    </>
                  )}
                  <span className="mx-1.5 opacity-40">·</span>
                  {POLICY_LABEL[data.join_policy || 'OPEN']}
                </p>
                {data.tagline && (
                  <p className="mt-3 text-[13.5px] text-white/70 leading-relaxed">
                    {data.tagline}
                  </p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-white/50">
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3 h-3" strokeWidth={1.75} /> {formatNumber(1)} member
                </span>
                {data.location_text && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" strokeWidth={1.75} />
                    {data.location_text}
                  </span>
                )}
              </div>

              {data.topics && data.topics.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {data.topics.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center rounded-full border border-white/[0.06] bg-white/[0.02] text-white/60 px-2 py-0.5 text-[10.5px] font-mono"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {data.rules && data.rules.length > 0 && (
                <div className="mt-6">
                  <p className="label-mono text-white/50 mb-2">Rules</p>
                  <ol className="space-y-1.5">
                    {data.rules.map((r, i) => (
                      <li key={i} className="text-[12.5px] text-white/70">
                        <span className="text-white/40 font-mono mr-2">{i + 1}.</span>
                        {r.title}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </StudioSectionCard>
      </div>

      <div className="space-y-3">
        <StudioTipCard icon={Info} title="Preview only">
          <p>The layout you see here is a live preview from your draft.</p>
          <p>The full public page with tabs (Discussion, Events, People…) unlocks once you publish.</p>
        </StudioTipCard>
      </div>
    </div>
  )
}