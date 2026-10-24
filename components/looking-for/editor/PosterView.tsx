'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CircleNotch, MapPin } from '@phosphor-icons/react'
import { REQUEST_TYPE_LABELS } from '@/types/teamup'

interface Me {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  tagline: string | null
  bio: string | null
  location: string | null
  is_verified: boolean
  execution_score: number
}

interface Skill { id: string; name: string }
interface ProjectMini { id: string; slug: string; name: string; logo_url: string | null; icon: string | null; tagline?: string | null }
interface VentureMini { id: string; slug: string; name: string; logo_url: string | null; tagline: string | null }

interface PastRequest {
  id: string
  source_type: string
  source_id: string
  title: string
  tagline: string | null
  request_type: string
  status: string
  published_at: string | null
  application_count: number
  positions_open: number
}

export function PosterView() {
  const [me, setMe] = useState<Me | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [projects, setProjects] = useState<ProjectMini[]>([])
  const [ventures, setVentures] = useState<VentureMini[]>([])
  const [pastRequests, setPastRequests] = useState<PastRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const meRes = await fetch('/api/looking-for/sidebar-me')
        const meData = await meRes.json()
        if (cancelled) return
        setMe(meData.user)
        setSkills(meData.skills || [])
        setProjects(meData.projects || [])
        setVentures(meData.ventures || [])

        if (meData.user?.username) {
          const pastRes = await fetch(`/api/profile/${meData.user.username}/opportunities`)
          const pastData = await pastRes.json()
          if (!cancelled) setPastRequests(pastData.opportunities || [])
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 flex items-center justify-center text-zinc-500">
        <CircleNotch size={16} className="animate-spin mr-2" />
        <span className="text-[13px]">Loading...</span>
      </div>
    )
  }

  if (!me) return null

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="text-[12px] text-zinc-500 leading-relaxed">
        This is how you'll appear publicly on this opportunity. Update your{' '}
        <Link href={`/profile/${me.username}`} className="text-zinc-300 hover:text-white underline underline-offset-2 font-semibold">
          profile
        </Link>{' '}
        to change what's shown here.
      </div>

      {/* Identity Card */}
      <Card>
        <div className="p-6">
          <div className="flex items-start gap-5">
            {me.avatar_url ? (
              <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-900 shrink-0 relative border border-zinc-800">
                <Image src={me.avatar_url} alt={me.full_name} fill className="object-cover" sizes="80px" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center text-[28px] font-bold text-zinc-400 shrink-0 border border-zinc-800">
                {me.full_name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-[22px] font-bold text-white tracking-tight">{me.full_name}</h2>
                {me.is_verified && (
                  <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-700 text-zinc-300">
                    Verified
                  </span>
                )}
              </div>
              <div className="text-[13.5px] text-zinc-400 mb-2">@{me.username}</div>
              {me.tagline && (
                <p className="text-[14px] text-zinc-200 leading-relaxed">{me.tagline}</p>
              )}
              {me.location && (
                <div className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-500 mt-3">
                  <MapPin size={11} />
                  {me.location}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Bio */}
      {me.bio && (
        <Card>
          <SectionHeader title="Bio" />
          <div className="p-5">
            <p className="text-[14px] text-zinc-200 leading-relaxed whitespace-pre-wrap">{me.bio}</p>
          </div>
        </Card>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <Card>
          <SectionHeader title="Skills" count={skills.length} />
          <div className="p-5">
            <div className="flex flex-wrap gap-1.5">
              {skills.map(s => (
                <span
                  key={s.id}
                  className="inline-flex items-center h-7 px-2.5 rounded text-[12px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-100"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Ventures */}
      {ventures.length > 0 && (
        <Card>
          <SectionHeader title="Ventures" count={ventures.length} />
          <div className="divide-y divide-zinc-800">
            {ventures.map(v => (
              <Link
                key={v.id}
                href={`/ventures/${v.slug}`}
                className="flex items-center gap-3.5 p-4 hover:bg-zinc-900/60 transition-colors group"
              >
                <div className="w-11 h-11 rounded-md overflow-hidden bg-zinc-900 shrink-0 flex items-center justify-center relative border border-zinc-800">
                  {v.logo_url ? (
                    <Image src={v.logo_url} alt="" fill className="object-cover" sizes="44px" />
                  ) : (
                    <span className="text-[15px] font-bold text-zinc-400">{v.name[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-zinc-100 group-hover:text-white truncate">{v.name}</div>
                  {v.tagline && (
                    <div className="text-[12px] text-zinc-500 truncate mt-0.5">{v.tagline}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <Card>
          <SectionHeader title="Projects" count={projects.length} />
          <div className="divide-y divide-zinc-800">
            {projects.map(p => (
              <Link
                key={p.id}
                href={`/projects/${p.slug}`}
                className="flex items-center gap-3.5 p-4 hover:bg-zinc-900/60 transition-colors group"
              >
                <div className="w-11 h-11 rounded-md overflow-hidden bg-zinc-900 shrink-0 flex items-center justify-center relative border border-zinc-800">
                  {p.logo_url ? (
                    <Image src={p.logo_url} alt="" fill className="object-cover" sizes="44px" />
                  ) : p.icon ? (
                    <span className="text-[17px]">{p.icon}</span>
                  ) : (
                    <span className="text-[15px] font-bold text-zinc-400">{p.name[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-zinc-100 group-hover:text-white truncate">{p.name}</div>
                  {p.tagline && (
                    <div className="text-[12px] text-zinc-500 truncate mt-0.5">{p.tagline}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Past Team-Ups */}
      {pastRequests.length > 0 && (
        <Card>
          <SectionHeader title="Past team-ups" count={pastRequests.length} />
          <div className="divide-y divide-zinc-800">
            {pastRequests.map(r => (
              <Link
                key={r.source_id}
                href={`/looking-for/${r.source_id}?source=${r.source_type}`}
                className="block p-4 hover:bg-zinc-900/60 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-300">
                    {REQUEST_TYPE_LABELS[r.request_type] || r.request_type}
                  </span>
                  {r.status === 'active' && (
                    <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Active
                    </span>
                  )}
                  {r.status === 'closed' && (
                    <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-500">
                      Closed
                    </span>
                  )}
                </div>
                <div className="text-[14px] font-semibold text-zinc-100 group-hover:text-white line-clamp-1">
                  {r.title}
                </div>
                {r.tagline && (
                  <div className="text-[12.5px] text-zinc-400 mt-0.5 line-clamp-1">{r.tagline}</div>
                )}
                <div className="flex items-center gap-3 text-[11.5px] text-zinc-500 mt-2 font-medium">
                  <span>{r.application_count} applicant{r.application_count !== 1 ? 's' : ''}</span>
                  {r.positions_open > 0 && (
                    <>
                      <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
                      <span>{r.positions_open} opening{r.positions_open !== 1 ? 's' : ''}</span>
                    </>
                  )}
                  {r.published_at && (
                    <>
                      <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
                      <span>{new Date(r.published_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">{children}</div>
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="border-b border-zinc-800 px-5 py-3.5">
      <div className="flex items-center gap-2">
        <h3 className="text-[13px] font-bold text-white tracking-tight">{title}</h3>
        {count !== undefined && count > 0 && (
          <span className="text-[11px] text-zinc-500 font-semibold">{count}</span>
        )}
      </div>
    </div>
  )
}
