'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CheckCircle, ArrowUpRight, UsersThree, Rocket, PuzzlePiece } from '@phosphor-icons/react'

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
interface ProjectMini { id: string; slug: string; name: string; logo_url: string | null; icon: string | null }
interface VentureMini { id: string; slug: string; name: string; logo_url: string | null; tagline: string | null }

export function AboutPosterView() {
  const [me, setMe] = useState<Me | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [projects, setProjects] = useState<ProjectMini[]>([])
  const [ventures, setVentures] = useState<VentureMini[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/looking-for/sidebar-me')
        const data = await res.json()
        if (cancelled) return
        setMe(data.user)
        setSkills(data.skills || [])
        setProjects(data.projects || [])
        setVentures(data.ventures || [])
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-xl border border-zinc-800/80 bg-zinc-950/40 animate-pulse" />
        <div className="h-32 rounded-xl border border-zinc-800/80 bg-zinc-950/40 animate-pulse" />
      </div>
    )
  }

  if (!me) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-[11px] text-zinc-500 leading-relaxed">
        This is how you'll appear publicly on this opportunity. Update your{' '}
        <Link href={`/profile/${me.username}`} className="text-zinc-300 hover:text-white underline">
          profile
        </Link>{' '}
        to change what's shown here.
      </div>

      {/* Main identity card */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-6">
        <div className="flex items-start gap-4">
          {me.avatar_url ? (
            <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-800 shrink-0 relative">
              <Image src={me.avatar_url} alt={me.full_name} fill className="object-cover" sizes="64px" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-[22px] font-medium text-zinc-400 shrink-0">
              {me.full_name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-semibold text-white">{me.full_name}</h2>
              {me.is_verified && <CheckCircle size={14} weight="fill" className="text-blue-400" />}
            </div>
            {me.tagline && (
              <p className="text-[13.5px] text-zinc-400 mt-1">{me.tagline}</p>
            )}
            {me.location && (
              <p className="text-[12px] text-zinc-500 mt-1.5">{me.location}</p>
            )}
          </div>
        </div>

        {me.bio && (
          <p className="text-[13.5px] text-zinc-300 leading-relaxed mt-4">{me.bio}</p>
        )}
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <SectionCard title="Skills" count={skills.length}>
          <div className="flex flex-wrap gap-1.5">
            {skills.slice(0, 20).map(s => (
              <span
                key={s.id}
                className="inline-flex items-center h-6 px-2 rounded text-[11px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300"
              >
                {s.name}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <SectionCard title="Projects" count={projects.length} Icon={PuzzlePiece}>
          <div className="space-y-2">
            {projects.slice(0, 4).map(p => (
              <Link
                key={p.id}
                href={`/projects/${p.slug}`}
                className="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-zinc-900/80 group"
              >
                <div className="w-8 h-8 rounded-md overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center relative">
                  {p.logo_url ? (
                    <Image src={p.logo_url} alt="" fill className="object-cover" sizes="32px" />
                  ) : p.icon ? (
                    <span className="text-[14px]">{p.icon}</span>
                  ) : (
                    <PuzzlePiece size={13} className="text-zinc-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-zinc-200 group-hover:text-white truncate">{p.name}</div>
                </div>
                <ArrowUpRight size={11} className="text-zinc-600 group-hover:text-zinc-300 shrink-0" />
              </Link>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Ventures */}
      {ventures.length > 0 && (
        <SectionCard title="Ventures" count={ventures.length} Icon={Rocket}>
          <div className="space-y-2">
            {ventures.slice(0, 4).map(v => (
              <Link
                key={v.id}
                href={`/ventures/${v.slug}`}
                className="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-zinc-900/80 group"
              >
                <div className="w-8 h-8 rounded-md overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center relative">
                  {v.logo_url ? (
                    <Image src={v.logo_url} alt="" fill className="object-cover" sizes="32px" />
                  ) : (
                    <Rocket size={13} className="text-zinc-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-zinc-200 group-hover:text-white truncate">{v.name}</div>
                  {v.tagline && (
                    <div className="text-[11px] text-zinc-500 truncate">{v.tagline}</div>
                  )}
                </div>
                <ArrowUpRight size={11} className="text-zinc-600 group-hover:text-zinc-300 shrink-0" />
              </Link>
            ))}
          </div>
        </SectionCard>
      )}

      {/* DSRT stats */}
      {me.execution_score > 0 && (
        <SectionCard title="On DSRT">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Execution score" value={me.execution_score} />
            <Stat label="Projects" value={projects.length} />
            <Stat label="Ventures" value={ventures.length} />
          </div>
        </SectionCard>
      )}
    </div>
  )
}

function SectionCard({ title, count, Icon, children }: { title: string; count?: number; Icon?: any; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-5">
      <div className="flex items-center gap-1.5 mb-3">
        {Icon && <Icon size={12} className="text-zinc-500" />}
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{title}</span>
        {count !== undefined && count > 0 && (
          <span className="text-[10.5px] text-zinc-600">· {count}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-[16px] font-semibold text-white">{value}</div>
    </div>
  )
}
