'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface UserData {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  tagline: string | null
  execution_score: number
}

interface Skill { id: string; name: string }

interface ProjectMini {
  id: string
  slug: string
  name: string
  logo_url: string | null
  icon: string | null
}

interface VentureMini {
  id: string
  slug: string
  name: string
  logo_url: string | null
  tagline: string | null
}

interface Settings {
  show_in_suggestions: boolean
  allow_invitations: boolean
}

export function RightSidebar() {
  const [user, setUser] = useState<UserData | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [projects, setProjects] = useState<ProjectMini[]>([])
  const [ventures, setVentures] = useState<VentureMini[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [meRes, settingsRes] = await Promise.all([
          fetch('/api/looking-for/sidebar-me'),
          fetch('/api/looking-for/settings'),
        ])
        const me = await meRes.json().catch(() => ({}))
        const s = await settingsRes.json().catch(() => ({}))
        if (cancelled) return
        setUser(me.user || null)
        setSkills(me.skills || [])
        setProjects(me.projects || [])
        setVentures(me.ventures || [])
        setSettings(s.settings || null)
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const toggleVisibility = async () => {
    if (!settings) return
    const next = !settings.show_in_suggestions
    setSettings({ ...settings, show_in_suggestions: next })
    try {
      await fetch('/api/looking-for/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show_in_suggestions: next }),
      })
    } catch {
      setSettings({ ...settings, show_in_suggestions: !next })
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-lg border border-zinc-800 bg-zinc-950/40 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {user && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
          <Link href={`/profile/${user.username}`} className="flex items-center gap-3 group">
            {user.avatar_url ? (
              <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 shrink-0 relative">
                <Image src={user.avatar_url} alt="" fill className="object-cover" sizes="48px" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-[16px] font-semibold text-zinc-400 shrink-0">
                {user.full_name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                {user.full_name}
              </div>
              {user.tagline && (
                <div className="text-[12px] text-zinc-500 truncate">{user.tagline}</div>
              )}
            </div>
          </Link>
          <Link
            href={`/profile/${user.username}`}
            className="inline-block text-[12px] text-zinc-500 hover:text-zinc-200 mt-3"
          >
            View profile →
          </Link>
        </div>
      )}

      <SidebarSection title="My Preferences">
        {settings && (
          <div className="flex items-center justify-between gap-3 py-1">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-zinc-100">Profile visibility</div>
              <div className="text-[11.5px] text-zinc-500 mt-0.5">Show in suggestions</div>
            </div>
            <ToggleSwitch
              checked={settings.show_in_suggestions}
              onChange={toggleVisibility}
              ariaLabel="Toggle profile visibility"
            />
          </div>
        )}
        <Link
          href="/looking-for?tab=settings"
          className="inline-block text-[12px] text-zinc-500 hover:text-zinc-200 mt-3"
        >
          All settings →
        </Link>
      </SidebarSection>

      <SidebarSection
        title="My Categories"
        rightAction={
          user && (
            <Link
              href={`/profile/${user.username}`}
              className="text-[11.5px] font-medium text-zinc-500 hover:text-zinc-200"
              title="Edit skills on your profile"
            >
              Edit
            </Link>
          )
        }
      >
        {skills.length === 0 ? (
          <div className="text-[12px] text-zinc-500 leading-relaxed">
            No skills added yet. Add skills to your profile so we can recommend the right opportunities.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {skills.slice(0, 14).map(s => (
              <span
                key={s.id}
                className="inline-flex items-center h-6 px-2 rounded text-[11.5px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-200"
              >
                {s.name}
              </span>
            ))}
            {skills.length > 14 && (
              <span className="inline-flex items-center h-6 px-2 text-[11.5px] text-zinc-500">
                +{skills.length - 14}
              </span>
            )}
          </div>
        )}
        <div className="text-[10.5px] text-zinc-500 leading-relaxed mt-2">
          Changes here update your profile. These skills decide what we recommend.
        </div>
      </SidebarSection>

      <SidebarSection title="My Catalog" count={projects.length}>
        {projects.length === 0 ? (
          <div className="text-[12px] text-zinc-500 leading-relaxed">
            No projects yet.
            <Link href="/projects" className="text-zinc-300 hover:text-white ml-1">Create one →</Link>
          </div>
        ) : (
          <div className="space-y-1.5">
            {projects.slice(0, 5).map(p => (
              <Link
                key={p.id}
                href={`/projects/${p.slug}`}
                className="flex items-center gap-2.5 px-2 py-1.5 -mx-1 rounded-md hover:bg-zinc-900 transition-colors group"
              >
                <div className="w-6 h-6 rounded-md overflow-hidden bg-zinc-800 shrink-0 relative flex items-center justify-center">
                  {p.logo_url ? (
                    <Image src={p.logo_url} alt="" fill className="object-cover" sizes="24px" />
                  ) : p.icon ? (
                    <span className="text-[12px]">{p.icon}</span>
                  ) : (
                    <span className="text-[10px] text-zinc-500 font-semibold">{p.name[0]?.toUpperCase()}</span>
                  )}
                </div>
                <span className="text-[13px] text-zinc-200 group-hover:text-white truncate flex-1">
                  {p.name}
                </span>
              </Link>
            ))}
            {projects.length > 5 && (
              <Link
                href="/projects"
                className="inline-block text-[11.5px] text-zinc-500 hover:text-zinc-200 mt-2"
              >
                View all {projects.length} →
              </Link>
            )}
          </div>
        )}
      </SidebarSection>

      <SidebarSection title="My Ventures" count={ventures.length}>
        {ventures.length === 0 ? (
          <div className="text-[12px] text-zinc-500 leading-relaxed">
            No ventures yet.
            <Link href="/ventures" className="text-zinc-300 hover:text-white ml-1">Create one →</Link>
          </div>
        ) : (
          <div className="space-y-1.5">
            {ventures.slice(0, 5).map(v => (
              <Link
                key={v.id}
                href={`/ventures/${v.slug}`}
                className="flex items-center gap-2.5 px-2 py-1.5 -mx-1 rounded-md hover:bg-zinc-900 transition-colors group"
              >
                <div className="w-6 h-6 rounded-md overflow-hidden bg-zinc-800 shrink-0 relative flex items-center justify-center">
                  {v.logo_url ? (
                    <Image src={v.logo_url} alt="" fill className="object-cover" sizes="24px" />
                  ) : (
                    <span className="text-[10px] text-zinc-500 font-semibold">{v.name[0]?.toUpperCase()}</span>
                  )}
                </div>
                <span className="text-[13px] text-zinc-200 group-hover:text-white truncate flex-1">
                  {v.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </SidebarSection>
    </div>
  )
}

function SidebarSection({
  title, count, rightAction, children,
}: {
  title: string
  count?: number
  rightAction?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold text-zinc-100 tracking-tight">
          {title}
          {count !== undefined && count > 0 && (
            <span className="text-zinc-500 font-medium ml-1.5">{count}</span>
          )}
        </h3>
        {rightAction}
      </div>
      {children}
    </section>
  )
}

function ToggleSwitch({ checked, onChange, ariaLabel }: { checked: boolean; onChange: () => void; ariaLabel?: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      className={
        'relative shrink-0 w-9 rounded-full transition-colors ' +
        (checked ? 'bg-white' : 'bg-zinc-700')
      }
      style={{ height: 20 }}
    >
      <span
        className={
          'absolute top-0.5 w-4 h-4 rounded-full shadow transition-all ' +
          (checked ? 'left-[18px] bg-black' : 'left-0.5 bg-white')
        }
      />
    </button>
  )
}
