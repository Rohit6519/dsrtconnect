'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Briefcase, MapPin, Clock, CurrencyDollar, Plus, ArrowRight,
  Lightning, CircleNotch, UsersThree, Eye, ChartBar
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Props {
  slug: string
  ventureId: string
  isOwner: boolean
}

export function VentureOpenRolesTab({ slug, ventureId, isOwner }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const loadRoles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ventures/${slug}/open-roles`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setRoles(json.roles || [])
    } catch (e: any) {
      toast.error(e.message || 'Could not load open roles')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { loadRoles() }, [loadRoles])

  // Real-time sync
  useEffect(() => {
    if (!ventureId) return
    const channel = supabase
      .channel(`venture-roles:${ventureId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'opportunities',
          filter: `venture_id=eq.${ventureId}`,
        },
        () => { loadRoles() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [ventureId, loadRoles, supabase])

  const handleCreateRole = async () => {
    setCreating(true)
    try {
      const res = await fetch(`/api/ventures/${slug}/open-roles/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')

      toast.success('Draft created. Opening Studio…')
      router.push(json.studio_url)
    } catch (e: any) {
      toast.error(e.message || 'Failed to create role')
      setCreating(false)
    }
  }

  const activeRoles = roles.filter(r => ['active', 'closing-soon'].includes(r.status))
  const draftRoles = roles.filter(r => r.status === 'draft')
  const closedRoles = roles.filter(r => ['closed', 'filled', 'archived', 'expired'].includes(r.status))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[20px] font-bold text-white">Open Roles</h2>
          <p className="text-[12.5px] text-white/50 mt-0.5">
            {activeRoles.length > 0
              ? `${activeRoles.length} active position${activeRoles.length !== 1 ? 's' : ''}`
              : 'No open positions currently'}
          </p>
        </div>

        {isOwner && (
          <button
            onClick={handleCreateRole}
            disabled={creating}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white text-black font-bold text-[12.5px] hover:bg-zinc-100 shadow-md transition-colors disabled:opacity-50"
          >
            {creating ? <CircleNotch size={14} className="animate-spin" /> : <Plus size={14} weight="bold" />}
            Post open role
          </button>
        )}
      </div>

      {loading ? (
        <div className="h-40 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-center text-zinc-500 gap-2 text-sm">
          <CircleNotch size={16} className="animate-spin" /> Loading roles…
        </div>
      ) : activeRoles.length === 0 && draftRoles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] p-16 text-center">
          <Briefcase size={32} className="text-white/20 mx-auto mb-3" />
          <h3 className="text-[15px] font-bold text-white mb-1">No open roles</h3>
          <p className="text-[12.5px] text-white/45 max-w-sm mx-auto mb-6">
            {isOwner
              ? 'Post roles to attract co-founders, engineers, designers, and more. Roles are distributed through DSRT Looking For.'
              : 'This venture isn\'t hiring right now. Follow to get notified when positions open.'}
          </p>
          {isOwner && (
            <button
              onClick={handleCreateRole}
              disabled={creating}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white text-black text-[12.5px] font-bold disabled:opacity-50"
            >
              <Plus size={13} weight="bold" /> Post first role
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active roles */}
          {activeRoles.length > 0 && (
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-3">
                Active ({activeRoles.length})
              </p>
              <div className="space-y-3">
                {activeRoles.map(role => (
                  <RoleCard
                    key={role.id}
                    role={role}
                    slug={slug}
                    isOwner={isOwner}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Draft roles (owner only) */}
          {isOwner && draftRoles.length > 0 && (
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-3">
                Drafts ({draftRoles.length})
              </p>
              <div className="space-y-3">
                {draftRoles.map(role => (
                  <RoleCard key={role.id} role={role} slug={slug} isOwner={isOwner} />
                ))}
              </div>
            </div>
          )}

          {/* Closed roles (owner only, collapsed) */}
          {isOwner && closedRoles.length > 0 && (
            <details className="group">
              <summary className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-3 cursor-pointer hover:text-zinc-300 list-none flex items-center gap-2">
                <span>Closed ({closedRoles.length})</span>
                <span className="text-zinc-600 group-open:rotate-90 transition-transform">▶</span>
              </summary>
              <div className="space-y-3 mt-3">
                {closedRoles.map(role => (
                  <RoleCard key={role.id} role={role} slug={slug} isOwner={isOwner} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

function RoleCard({ role, slug, isOwner }: { role: any; slug: string; isOwner: boolean }) {
  const router = useRouter()
  const isActive = ['active', 'closing-soon'].includes(role.status)
  const isDraft = role.status === 'draft'
  const isClosed = ['closed', 'filled', 'archived', 'expired'].includes(role.status)
  const stats = role.application_stats || {}

  const handleOpenStudio = () => {
    router.push(`/looking-for/create-v2/${role.id}`)
  }

  const handleManageApplications = () => {
    router.push(`/looking-for/my-opportunities/${role.id}`)
  }

  return (
    <div className={
      'bg-[#121215] border rounded-2xl overflow-hidden transition-all ' +
      (isActive
        ? 'border-white/[0.08] hover:border-white/[0.15]'
        : isDraft
          ? 'border-blue-500/20 bg-blue-500/[0.02]'
          : 'border-white/[0.04] opacity-70')
    }>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title + badges */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <h3 className="text-[16px] font-bold text-white leading-tight">{role.title}</h3>

              {isDraft && (
                <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300">
                  Draft
                </span>
              )}
              {role.urgency === 'urgent' && isActive && (
                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-300">
                  <Lightning size={9} weight="fill" /> Urgent
                </span>
              )}
              {isClosed && (
                <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
                  {role.status}
                </span>
              )}
            </div>

            {/* Meta chips */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-white/50">
              {role.work_mode && (
                <span className="flex items-center gap-1 capitalize">
                  <MapPin size={11} /> {role.work_mode}
                </span>
              )}
              {role.location && (
                <span>{role.location}</span>
              )}
              {role.time_commitment && (
                <span className="flex items-center gap-1 capitalize">
                  <Clock size={11} /> {role.time_commitment.replace('_', ' ')}
                </span>
              )}
              {role.compensation_type && role.compensation_type !== 'none' && (
                <span className="flex items-center gap-1">
                  <CurrencyDollar size={11} />
                  {role.compensation_min && role.compensation_max
                    ? `${role.compensation_currency || '$'}${role.compensation_min}–${role.compensation_max}`
                    : role.compensation_type
                  }
                </span>
              )}
              {role.experience_level && (
                <span className="capitalize">{role.experience_level.replace('-', ' ')}</span>
              )}
            </div>

            {/* Skills */}
            {role.required_skills?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {role.required_skills.slice(0, 6).map((s: string) => (
                  <span key={s} className="text-[10.5px] font-medium text-white/70 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded">
                    {s}
                  </span>
                ))}
                {role.required_skills.length > 6 && (
                  <span className="text-[10.5px] text-white/40">
                    +{role.required_skills.length - 6}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            {isDraft && isOwner ? (
              <button
                onClick={handleOpenStudio}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-black bg-white hover:bg-zinc-200 px-3.5 h-9 rounded-lg transition-colors"
              >
                Continue editing <ArrowRight size={11} weight="bold" />
              </button>
            ) : isActive ? (
              role.has_applied ? (
                <span className="text-[12px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 h-8 rounded-lg flex items-center">
                  Applied ✓
                </span>
              ) : (
                <Link
                  href={`/looking-for/${role.slug || role.id}`}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-white/[0.06] hover:bg-white hover:text-black border border-white/[0.08] px-3.5 h-9 rounded-lg transition-colors"
                >
                  Apply <ArrowRight size={11} weight="bold" />
                </Link>
              )
            ) : null}
          </div>
        </div>

        {/* Owner: Application stats + manage link */}
        {isOwner && isActive && (
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4 text-[11.5px] text-white/50">
              <span className="flex items-center gap-1">
                <UsersThree size={12} />
                {stats.total || 0} applicant{(stats.total || 0) !== 1 ? 's' : ''}
              </span>
              {stats.new > 0 && (
                <span className="text-blue-300">{stats.new} new</span>
              )}
              {stats.shortlisted > 0 && (
                <span className="text-emerald-300">{stats.shortlisted} shortlisted</span>
              )}
              {stats.interview > 0 && (
                <span className="text-amber-300">{stats.interview} in interview</span>
              )}
              <span className="flex items-center gap-1">
                <Eye size={12} /> {role.view_count || 0} views
              </span>
            </div>

            <button
              onClick={handleManageApplications}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] text-[11.5px] font-semibold text-white transition-colors"
            >
              <ChartBar size={12} /> Manage applications
            </button>
          </div>
        )}

        {/* Published date */}
        <div className="mt-3 text-[10.5px] text-white/30">
          {role.published_at
            ? `Published ${new Date(role.published_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}`
            : `Created ${new Date(role.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}`
          }
          {role.positions_open > 1 && ` · ${role.positions_open} openings`}
        </div>
      </div>
    </div>
  )
}