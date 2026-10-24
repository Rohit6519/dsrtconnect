'use client'

import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle, ArrowUpRight, Rocket, PuzzlePiece, MapPin } from '@phosphor-icons/react'

export interface PosterData {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  tagline: string | null
  bio: string | null
  location: string | null
  is_verified: boolean
  execution_score: number
  follower_count?: number
  brings?: string[] | null
}

export interface PosterSkill { id: string; name: string }
export interface PosterProject { id: string; slug: string; name: string; logo_url: string | null; icon: string | null; tagline?: string | null }
export interface PosterVenture { id: string; slug: string; name: string; logo_url: string | null; tagline: string | null }

interface Props {
  poster: PosterData
  skills?: PosterSkill[]
  projects?: PosterProject[]
  ventures?: PosterVenture[]
  compact?: boolean
}

export function PublicPosterRender({ poster, skills = [], projects = [], ventures = [], compact = false }: Props) {
  return (
    <div className={compact ? 'max-w-xl mx-auto space-y-4' : 'max-w-2xl mx-auto space-y-5'}>
      {/* Identity */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-5">
        <div className="flex items-start gap-4">
          {poster.avatar_url ? (
            <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-800 shrink-0 relative">
              <Image src={poster.avatar_url} alt={poster.full_name} fill className="object-cover" sizes="56px" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center text-[18px] font-medium text-zinc-400 shrink-0">
              {poster.full_name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/profile/${poster.username}`}
                className="text-[17px] font-semibold text-white hover:text-blue-400 truncate"
              >
                {poster.full_name}
              </Link>
              {poster.is_verified && <CheckCircle size={13} weight="fill" className="text-blue-400" />}
            </div>
            {poster.tagline && (
              <p className="text-[13px] text-zinc-400 mt-0.5">{poster.tagline}</p>
            )}
            {poster.location && (
              <div className="inline-flex items-center gap-1 text-[11.5px] text-zinc-500 mt-1.5">
                <MapPin size={10} />
                {poster.location}
              </div>
            )}
          </div>
          <Link
            href={`/profile/${poster.username}`}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-zinc-800 hover:border-zinc-600 text-[12px] text-zinc-200 shrink-0"
          >
            Profile
            <ArrowUpRight size={11} weight="bold" />
          </Link>
        </div>

        {poster.bio && (
          <p className="text-[13px] text-zinc-300 leading-relaxed mt-4">{poster.bio}</p>
        )}
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <Section title="Skills" count={skills.length}>
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
        </Section>
      )}

      {/* Ventures */}
      {ventures.length > 0 && (
        <Section title="Ventures" count={ventures.length} Icon={Rocket}>
          <div className="space-y-1">
            {ventures.slice(0, 4).map(v => (
              <Link
                key={v.id}
                href={`/ventures/${v.slug}`}
                className="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-zinc-900/60 group"
              >
                <div className="w-8 h-8 rounded-md overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center relative">
                  {v.logo_url ? (
                    <Image src={v.logo_url} alt="" fill className="object-cover" sizes="32px" />
                  ) : (
                    <Rocket size={13} className="text-zinc-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-zinc-100 group-hover:text-white truncate">{v.name}</div>
                  {v.tagline && (
                    <div className="text-[11px] text-zinc-500 truncate">{v.tagline}</div>
                  )}
                </div>
                <ArrowUpRight size={11} className="text-zinc-600 group-hover:text-zinc-300 shrink-0" />
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <Section title="Projects" count={projects.length} Icon={PuzzlePiece}>
          <div className="space-y-1">
            {projects.slice(0, 4).map(p => (
              <Link
                key={p.id}
                href={`/projects/${p.slug}`}
                className="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-zinc-900/60 group"
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
                  <div className="text-[13px] text-zinc-100 group-hover:text-white truncate">{p.name}</div>
                </div>
                <ArrowUpRight size={11} className="text-zinc-600 group-hover:text-zinc-300 shrink-0" />
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ title, count, Icon, children }: { title: string; count?: number; Icon?: any; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
      <div className="flex items-center gap-1.5 mb-3">
        {Icon && <Icon size={11} className="text-zinc-500" />}
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{title}</span>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] text-zinc-600">· {count}</span>
        )}
      </div>
      {children}
    </div>
  )
}
