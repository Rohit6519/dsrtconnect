'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { Globe, MapPin, Calendar, ShieldCheck, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatNumber } from '@/lib/utils'
import type { CommunityDetail } from '@/hooks/useCommunityDetail'
import { DsrtPanel, DsrtSection, DsrtGrid } from '@/components/dsrt'

export function AboutTab({ detail }: { detail: CommunityDetail }) {
  const c = detail.community

  return (
    <DsrtGrid cols={{ base: 1, lg: 3 }} gap="lg">
      <div className="lg:col-span-2 space-y-6">
        <DsrtPanel>
          <DsrtSection title="About" headerVariant="mono">
            {c.description ? (
              <p className="text-[14px] text-white/80 leading-relaxed whitespace-pre-wrap">
                {c.description}
              </p>
            ) : (
              <p className="text-[13px] text-white/40">No description yet.</p>
            )}
          </DsrtSection>
        </DsrtPanel>

        {c.mission && (
          <DsrtPanel>
            <DsrtSection title="Mission" headerVariant="mono">
              <p className="text-[14px] text-white/80 leading-relaxed whitespace-pre-wrap">
                {c.mission}
              </p>
            </DsrtSection>
          </DsrtPanel>
        )}

        {detail.rules && detail.rules.length > 0 && (
          <DsrtPanel>
            <DsrtSection title="Community Rules" headerVariant="mono">
              <ol className="space-y-4 pt-2">
                {detail.rules.map((r, i) => (
                  <li key={r.id} className="flex items-start gap-4">
                    <span className="text-[13px] font-mono font-bold text-white/30 pt-0.5">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-white">{r.title}</p>
                      {r.description && (
                        <p className="mt-1 text-[13px] text-white/60 leading-relaxed">
                          {r.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </DsrtSection>
          </DsrtPanel>
        )}
      </div>

      <aside className="space-y-6">
        <DsrtPanel>
          <DsrtSection title="Details" headerVariant="mono">
            <dl className="space-y-3.5 text-[13px] pt-1">
              <Detail label="Category">{c.category || 'general'}</Detail>
              <Detail label="Type">{(c.community_type || '').replace(/_/g, ' ') || '—'}</Detail>
              <Detail label="Visibility">{c.visibility}</Detail>
              <Detail label="Join policy">{c.join_policy.replace(/_/g, ' ')}</Detail>
              <Detail label="Members">
                <span className="inline-flex items-center gap-1.5 text-white/80">
                  <Users className="w-4 h-4 text-white/40" />
                  {formatNumber(c.member_count)}
                </span>
              </Detail>
              {c.location_text && (
                <Detail label="Location">
                  <span className="inline-flex items-center gap-1.5 text-white/80">
                    <MapPin className="w-4 h-4 text-white/40" />
                    <span className="truncate">{c.location_text}</span>
                  </span>
                </Detail>
              )}
              {c.website && (
                <Detail label="Website">
                  <a href={c.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-white/80 hover:text-[#93c5fd] transition-colors">
                    <Globe className="w-4 h-4 text-white/40" />
                    <span className="truncate">{c.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                  </a>
                </Detail>
              )}
              {c.founded_at && (
                <Detail label="Founded">
                  <span className="inline-flex items-center gap-1.5 text-white/80">
                    <Calendar className="w-4 h-4 text-white/40" />
                    {format(new Date(c.founded_at), 'MMMM yyyy')}
                  </span>
                </Detail>
              )}
              <Detail label="Created">{format(new Date(c.created_at), 'MMM d, yyyy')}</Detail>
            </dl>
          </DsrtSection>
        </DsrtPanel>

        {detail.admins.length > 0 && (
          <DsrtPanel>
            <DsrtSection title="Leadership" headerVariant="mono">
              <div className="space-y-1.5 pt-2 -mx-2">
                {detail.admins.map((a) => (
                  <Link
                    key={a.identity_id}
                    href={`/profile/${a.user.username}`}
                    className="flex items-center gap-3 group p-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                  >
                    <Avatar className="w-10 h-10 border border-white/[0.08]">
                      <AvatarImage src={a.user.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[12px] bg-white/[0.04] text-white/80 font-semibold">
                        {(a.user.full_name || '?').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-white truncate group-hover:text-[#93c5fd] transition-colors flex items-center gap-1.5">
                        {a.user.full_name}
                        {a.user.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-[#93c5fd]" />}
                      </p>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-white/40 truncate mt-0.5">
                        {a.role_key.toLowerCase()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </DsrtSection>
          </DsrtPanel>
        )}
      </aside>
    </DsrtGrid>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.04] pb-3 mb-1 last:border-none last:pb-0 last:mb-0">
      <dt className="text-[11px] font-mono uppercase tracking-wider text-white/40">{label}</dt>
      <dd className="text-[13px] font-medium text-white/90 truncate max-w-[220px] text-right">{children}</dd>
    </div>
  )
}