'use client'

import Link from 'next/link'
import { ExternalLink, Globe, MapPin, Users, ShieldCheck, Crown, Shield } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import type { CommunityDetail } from '@/hooks/useCommunityDetail'
import { useSimilarCommunities } from '@/hooks/useCommunityDetail'
import { DsrtPanel, DsrtAvatar } from '@/components/dsrt'

export function CommunityRightRail({ detail }: { detail: CommunityDetail }) {
  const c = detail.community
  const similar = useSimilarCommunities(c.slug)

  return (
    <div className="space-y-4">
      <DsrtPanel padding="md">
        <h3 className="text-[12px] font-mono font-bold uppercase tracking-wider text-white/50 mb-3">About</h3>
        <p className="text-[13px] text-white/80 leading-relaxed whitespace-pre-wrap">
          {c.description || c.short_description || 'No description yet.'}
        </p>
        <div className="mt-4 space-y-2 text-[12px] font-medium text-white/60">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            {formatNumber(c.member_count)} members
          </div>
          {c.location_text && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 min-w-0" />
              <span className="truncate">{c.location_text}</span>
            </div>
          )}
          {c.website && (
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              <a href={c.website} target="_blank" rel="noreferrer" className="hover:text-white truncate transition-colors">
                {c.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            </div>
          )}
        </div>
      </DsrtPanel>

      {detail.rules && detail.rules.length > 0 && (
        <DsrtPanel padding="md">
          <h3 className="text-[12px] font-mono font-bold uppercase tracking-wider text-white/50 mb-3">Rules</h3>
          <ol className="space-y-3">
            {detail.rules.map((r, i) => (
              <li key={r.id} className="text-[13px] text-white/80 leading-relaxed flex gap-2">
                <span className="text-white/40 font-mono font-semibold">{i + 1}.</span>
                <div>
                  <span className="font-semibold text-white">{r.title}</span>
                  {r.description && <p className="mt-1 text-[12px] text-white/50">{r.description}</p>}
                </div>
              </li>
            ))}
          </ol>
        </DsrtPanel>
      )}

      {detail.admins && detail.admins.length > 0 && (
        <DsrtPanel padding="md">
          <h3 className="text-[12px] font-mono font-bold uppercase tracking-wider text-white/50 mb-3">Admins</h3>
          <div className="space-y-1">
            {detail.admins.map((a) => {
              const Icon = a.role_key === 'OWNER' ? Crown : Shield
              return (
                <Link
                  key={a.identity_id}
                  href={`/profile/${a.user.username}`}
                  className="flex items-center gap-3 group p-2 -mx-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                >
                  <DsrtAvatar src={a.user.avatar_url} name={a.user.full_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-white truncate group-hover:text-[#93c5fd] transition-colors flex items-center gap-1.5">
                      {a.user.full_name}
                      {a.user.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-[#93c5fd]" />}
                    </p>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-white/40 truncate flex items-center gap-1 mt-0.5">
                      <Icon className="w-3 h-3" />
                      {a.role_key.toLowerCase()}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </DsrtPanel>
      )}

      {similar.items.length > 0 && (
        <DsrtPanel padding="md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[12px] font-mono font-bold uppercase tracking-wider text-white/50">Similar</h3>
            <Link
              href="/community"
              className="text-[10px] font-mono uppercase tracking-wider text-white/40 hover:text-white transition-colors flex items-center gap-1"
            >
              More <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-1">
            {similar.items.map((s: any) => (
              <Link
                key={s.id}
                href={`/community/${s.slug}`}
                className="flex items-center gap-3 group p-2 -mx-2 rounded-lg hover:bg-white/[0.04] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl border border-white/[0.08] bg-[#05070D] flex items-center justify-center text-[12px] font-bold text-white/70 overflow-hidden shrink-0">
                  {s.cover_url ? (
                    <img src={s.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (s.name || '?').slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-white truncate group-hover:text-[#93c5fd] flex items-center gap-1.5">
                    {s.name}
                    {s.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-[#93c5fd]" />}
                  </p>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-white/40 truncate mt-0.5">
                    {formatNumber(s.member_count)} members · {s.category || 'general'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </DsrtPanel>
      )}
    </div>
  )
}