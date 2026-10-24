'use client'

import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CreateVentureLandingModal } from '@/components/venture-assessment/CreateVentureLandingModal'
import { VentureExplorePage } from '@/components/ventures-explore/VentureExplorePage'
import {
  Plus, Buildings, Users, ArrowRight, CircleNotch,
  CaretDown, WarningCircle, DotsThree, MapPin,
  ArrowSquareOut, Star, BookmarkSimple, Lightbulb, ShieldCheck, SquaresFour,
  Heart, Briefcase, Wrench, GitBranch, CheckCircle
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Venture {
  id: string
  slug: string
  name: string
  tagline?: string | null
  description?: string | null
  logo_url?: string | null
  cover_url?: string | null
  stage?: string
  status?: string
  industry?: string | null
  location?: string | null
  profile_completion?: number
  is_draft?: boolean
  is_verified?: boolean
  is_hiring?: boolean
  seeking_investment?: boolean
  follower_count?: number
  view_count?: number
  team_count?: number
  last_activity_at?: string
  updated_at?: string
  created_at?: string
}

type TabId = 'my-ventures' | 'explore' | 'following' | 'applications'

// ═══ DSRT Custom Geometric Tab Icons ═══
type IconProps = React.SVGProps<SVGSVGElement>

const IconMyVentures = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 20h16 M4 16h16 M12 4v12 M8 8l4-4 4 4" />
  </svg>
)

const IconExplore = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
)

const IconFollowing = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
)

const IconApplications = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
)

const TABS = [
  { id: 'my-ventures', label: 'My Ventures', icon: IconMyVentures },
  { id: 'explore',     label: 'Explore',     icon: IconExplore },
  { id: 'following',   label: 'Following',   icon: IconFollowing },
  { id: 'applications', label: 'Applications', icon: IconApplications },
]

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

export function VenturesDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090b] text-white p-10 flex items-center justify-center">
        <CircleNotch size={24} className="animate-spin text-zinc-500 mr-2" />
        <span className="text-xs text-zinc-500 font-mono">Loading workspace...</span>
      </div>
    }>
      <VenturesDashboardContent />
    </Suspense>
  )
}

function VenturesDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const openCreate = useCallback(() => setCreateModalOpen(true), [])

  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const tab = searchParams.get('tab')
    if (tab === 'explore' || tab === 'following' || tab === 'applications') return tab
    return 'my-ventures'
  })

  const [user, setUser] = useState<any>(null)
  const [myVentures, setMyVentures] = useState<Venture[]>([])
  const [followingVentures, setFollowingVentures] = useState<Venture[]>([])
  const [resources, setResources] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [sortOption, setSortOption] = useState<'updated' | 'created' | 'name' | 'stage'>('updated')
  const [sortOpen, setSortOpen] = useState(false)
  const [deleteModalVenture, setDeleteModalVenture] = useState<Venture | null>(null)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  const loadWorkspaceData = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: profile } = await supabase
          .from('users')
          .select('full_name, avatar_url, username')
          .eq('id', user.id)
          .maybeSingle()
        if (profile) setUser({ ...user, profile })
      }

      const [venturesRes, resourcesRes] = await Promise.all([
        fetch('/api/ventures/me'),
        supabase.from('founder_resources').select('*').order('display_order', { ascending: true })
      ])

      if (venturesRes.ok) {
        const vJson = await venturesRes.json()
        setMyVentures(vJson.ventures || [])
      } else {
        const myRes = await fetch('/api/ventures/my')
        if (myRes.ok) {
          const myJson = await myRes.json()
          setMyVentures(myJson.ventures || [])
        }
      }

      if (resourcesRes.data) {
        setResources(resourcesRes.data)
      }
    } catch (e) {
      console.error('Ventures dashboard fetch error:', e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadWorkspaceData()
  }, [loadWorkspaceData])

  useEffect(() => {
    if (activeTab === 'following') {
      fetch('/api/ventures/following')
        .then(r => r.json())
        .then(d => setFollowingVentures(d.ventures || []))
        .catch(() => {})
    }
  }, [activeTab])

  const handleConfirmDelete = async () => {
    if (!deleteModalVenture || deleteConfirmInput.trim() !== deleteModalVenture.name.trim()) {
      toast.error('Venture name does not match')
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/ventures/${deleteModalVenture.slug}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete venture')

      toast.success('Venture deleted')
      setMyVentures(prev => prev.filter(v => v.id !== deleteModalVenture.id))
      setDeleteModalVenture(null)
      setDeleteConfirmInput('')
    } catch (e: any) {
      toast.error(e.message || 'Could not delete venture')
    } finally {
      setDeleting(false)
    }
  }

  const sortedVentures = [...myVentures].sort((a, b) => {
    if (sortOption === 'created') {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    }
    if (sortOption === 'name') {
      return a.name.localeCompare(b.name)
    }
    if (sortOption === 'stage') {
      return (a.stage || '').localeCompare(b.stage || '')
    }
    return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
  })

  const firstName = user?.profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'Founder'

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#05070D] text-white pb-24 font-sans w-full overflow-hidden">
      
      {/* ── HEADER ────────────────────────────────────── */}
      <div className="w-full max-w-[1240px] mx-auto px-4 md:px-8 pt-10 md:pt-14 pb-8 flex flex-col gap-8">
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h1 className="text-[28px] sm:text-[34px] font-extrabold tracking-tight text-white leading-tight">
              {greeting()},{' '}
              <span className="text-white/80">{firstName}.</span>
            </h1>
            <p className="text-[14.5px] text-zinc-400 mt-2 max-w-xl font-medium">
              Here is what's happening across your ventures.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-6 rounded-full bg-white text-[#05070D] hover:bg-zinc-200 text-[13.5px] font-bold shadow-sm transition-all active:scale-95 shrink-0"
          >
            <Plus size={16} weight="bold" /> New venture
          </button>
        </div>

        {/* ── ADVANCED DSRT TABS (Orange) ──────────────────── */}
        <div className="border-b border-white/[0.08]">
          <div className="flex gap-2 sm:gap-6 -mb-px overflow-x-auto scrollbar-hide px-1">
            {TABS.map(tab => {
              const active = activeTab === tab.id
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabId)}
                  className={cn(
                    'flex flex-col items-center gap-2.5 pb-3 min-w-[80px] transition-all border-b-[3px] outline-none',
                    active ? 'border-[#fb923c]' : 'border-transparent hover:border-white/20'
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                    active 
                      ? "bg-gradient-to-br from-[#fb923c]/20 to-[#ea580c]/10 border border-[#fb923c]/30 shadow-[0_0_20px_rgba(251,146,60,0.15)]" 
                      : "bg-white/[0.02] border border-white/[0.05] group-hover:bg-white/[0.05]"
                  )}>
                    <Icon className={cn("w-6 h-6", active ? "text-[#fb923c]" : "text-zinc-500")} />
                  </div>
                  <span className={cn(
                    "text-[12px] sm:text-[13px] whitespace-nowrap transition-all", 
                    active ? "text-white font-bold tracking-wide" : "text-zinc-500 font-semibold"
                  )}>
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1240px] mx-auto px-4 md:px-8 pt-4 min-w-0">

        {activeTab === 'my-ventures' && (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 lg:gap-10 items-start w-full">
            
            {/* LEFT RAIL - SOLID GRADIENT PANELS */}
            <div className="hidden lg:flex flex-col gap-5 sticky top-[24px]">
              <InfoPanel
                title="BUILD WITH INTENT"
                icon={Lightbulb}
                text="Your venture profile is the public representation of what you are building. Keep the information clear, current and specific. People evaluating your venture should understand the problem, product and direction quickly."
                linkText="Learn how to present your venture"
                linkHref="/resources"
              />
              <InfoPanel
                title="DISCOVERABILITY"
                icon={ShieldCheck}
                text="A complete venture profile can appear across DSRT Connect where relevant. Your venture may be surfaced to people based on industry, interests, skills, stage and activity."
                linkText="Manage visibility"
                linkHref="/settings"
              />
              <ServicesPanel />
            </div>

            {/* RIGHT WORKSPACE */}
            <div className="min-w-0 w-full flex flex-col gap-8">
              
              <div className="bg-[#121215] border border-white/[0.06] rounded-3xl p-10 flex flex-col items-center text-center shadow-sm w-full">
                <div className="w-16 h-16 bg-white/[0.03] rounded-2xl flex items-center justify-center border border-white/[0.05] mb-5">
                  <Buildings size={32} className="text-zinc-500" />
                </div>
                <h2 className="text-[20px] font-bold text-white mb-2">Start a new venture</h2>
                <p className="text-[14px] text-zinc-400 max-w-md mx-auto mb-6 leading-relaxed font-medium">
                  Bring your idea to life. Create a professional venture profile to present your company, product, vision and progress.
                </p>
                <button
                  onClick={openCreate}
                  className="flex items-center gap-2 h-11 px-6 rounded-xl bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-white font-bold text-[13.5px] transition-colors"
                >
                  <Plus size={16} weight="bold" /> Start your venture
                </button>
              </div>

              <section className="flex flex-col gap-6 w-full min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[18px] font-bold text-white tracking-tight">Your ventures</h2>
                    <p className="text-[13px] text-zinc-400 mt-0.5 font-medium">Manage the ventures you own or help build.</p>
                  </div>

                  <div className="relative shrink-0">
                    <button
                      onClick={() => setSortOpen(!sortOpen)}
                      className="flex items-center gap-1.5 text-[12px] font-bold text-zinc-400 hover:text-white bg-[#121215] border border-white/[0.08] px-4 py-2.5 rounded-xl transition-colors h-full"
                    >
                      Sort by: <span className="text-white capitalize">{sortOption.replace('-', ' ')}</span>
                      <CaretDown size={14} weight="bold" />
                    </button>

                    {sortOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 w-48 bg-[#0d0d10] border border-white/[0.08] rounded-xl shadow-2xl z-20 py-1.5">
                          <button onClick={() => { setSortOption('updated'); setSortOpen(false); }} className={`w-full text-left px-4 py-2.5 text-[12.5px] transition-colors ${sortOption === 'updated' ? 'bg-white/[0.06] text-white font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/[0.03] font-medium'}`}>Last updated</button>
                          <button onClick={() => { setSortOption('created'); setSortOpen(false); }} className={`w-full text-left px-4 py-2.5 text-[12.5px] transition-colors ${sortOption === 'created' ? 'bg-white/[0.06] text-white font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/[0.03] font-medium'}`}>Recently created</button>
                          <button onClick={() => { setSortOption('name'); setSortOpen(false); }} className={`w-full text-left px-4 py-2.5 text-[12.5px] transition-colors ${sortOption === 'name' ? 'bg-white/[0.06] text-white font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/[0.03] font-medium'}`}>Name (A–Z)</button>
                          <button onClick={() => { setSortOption('stage'); setSortOpen(false); }} className={`w-full text-left px-4 py-2.5 text-[12.5px] transition-colors ${sortOption === 'stage' ? 'bg-white/[0.06] text-white font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/[0.03] font-medium'}`}>Stage</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {loading ? (
                  <div className="space-y-4 w-full">
                    {[1, 2].map(i => (
                      <div key={i} className="h-[180px] rounded-2xl bg-[#121215] border border-white/[0.04] p-5 animate-pulse flex gap-5 w-full">
                        <div className="w-[200px] h-[120px] rounded-xl bg-white/[0.03]" />
                        <div className="flex-1 space-y-3 py-1">
                          <div className="h-5 w-1/3 bg-white/[0.03] rounded" />
                          <div className="h-4 w-1/4 bg-white/[0.03] rounded" />
                          <div className="h-10 w-full bg-white/[0.03] rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="p-8 border border-red-500/20 bg-red-500/5 rounded-2xl text-center space-y-3 w-full">
                    <WarningCircle size={28} className="text-red-400 mx-auto" />
                    <h3 className="text-[16px] font-bold text-white">Unable to load your ventures</h3>
                    <p className="text-[13px] text-zinc-400 max-w-sm mx-auto">
                      Something went wrong while retrieving your venture workspace.
                    </p>
                    <button onClick={loadWorkspaceData} className="px-5 py-2.5 bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-white rounded-xl text-[13px] font-bold transition-colors">
                      Try again
                    </button>
                  </div>
                ) : sortedVentures.length === 0 ? (
                  <div className="p-12 border border-white/[0.06] rounded-2xl bg-[#121215]/50 text-center space-y-3 shadow-inner w-full">
                    <Buildings size={32} className="text-zinc-600 mx-auto mb-3" />
                    <h3 className="text-[16px] font-bold text-white">No ventures yet</h3>
                    <p className="text-[13.5px] text-zinc-500 max-w-sm mx-auto">
                      You are not currently listed as owner or team member for any venture workspace.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 w-full min-w-0">
                    {sortedVentures.map(v => (
                      <VentureHorizontalCard key={v.id} venture={v} onDeleteRequest={(target) => setDeleteModalVenture(target)} />
                    ))}
                  </div>
                )}
              </section>

              {/* Mobile Info Panels */}
              <div className="flex lg:hidden flex-col gap-5 mt-8 w-full">
                <InfoPanel
                  title="BUILD WITH INTENT"
                  icon={Lightbulb}
                  text="Your venture profile is the public representation of what you are building. Keep the information clear, current and specific. People evaluating your venture should understand the problem, product and direction quickly."
                  linkText="Learn how to present your venture"
                  linkHref="/resources"
                />
                <InfoPanel
                  title="DISCOVERABILITY"
                  icon={ShieldCheck}
                  text="A complete venture profile can appear across DSRT Connect where relevant. Your venture may be surfaced to people based on industry, interests, skills, stage and activity."
                  linkText="Manage visibility"
                  linkHref="/settings"
                />
                <ServicesPanel />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'explore' && (
          <div className="pt-2">
            <VentureExplorePage />
          </div>
        )}

        {activeTab === 'following' && (
          <div>
            {followingVentures.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/[0.1] p-16 text-center bg-[#121215]/50 max-w-4xl mx-auto">
                <div className="w-16 h-16 bg-white/[0.03] rounded-2xl flex items-center justify-center mx-auto border border-white/[0.05] mb-5">
                  <Heart size={32} className="text-zinc-500" />
                </div>
                <h3 className="text-[18px] font-bold text-white mb-2">Not following any ventures</h3>
                <p className="text-[13.5px] text-zinc-500 mb-6 max-w-md mx-auto">Follow ventures in Explore to track their growth updates in your feed.</p>
                <button onClick={() => setActiveTab('explore')} className="inline-flex items-center h-11 px-6 rounded-xl bg-white text-[#05070D] hover:bg-zinc-200 text-[13.5px] font-bold transition-colors">
                  Explore ventures
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl">
                {followingVentures.map(v => (
                  <VentureHorizontalCard key={v.id} venture={v} onDeleteRequest={(target) => setDeleteModalVenture(target)} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="rounded-3xl border border-dashed border-white/[0.1] p-16 text-center bg-[#121215]/50 max-w-4xl mx-auto">
            <div className="w-16 h-16 bg-white/[0.03] rounded-2xl flex items-center justify-center mx-auto border border-white/[0.05] mb-5">
              <Briefcase size={32} className="text-zinc-500" />
            </div>
            <h3 className="text-[18px] font-bold text-white mb-2">Applications & Roles</h3>
            <p className="text-[13.5px] text-zinc-500 max-w-md mx-auto mb-6">
              Applications submitted to venture roles or received by your ventures are managed via canonical Looking For opportunities.
            </p>
            <Link href="/looking-for" className="inline-flex items-center h-11 px-6 rounded-xl bg-white text-[#05070D] hover:bg-zinc-200 text-[13.5px] font-bold transition-colors">
              Open Looking For
            </Link>
          </div>
        )}

        {activeTab !== 'explore' && (
          <FounderResourcesMarquee resources={resources} />
        )}

        <DSRTFooter />

      </div>

      {deleteModalVenture && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setDeleteModalVenture(null)}>
          <div className="bg-[#121215] border border-white/[0.1] rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-[18px] font-bold text-white">Delete venture?</h3>
            <p className="text-[13.5px] text-zinc-400 leading-relaxed">
              This permanently removes the venture profile <strong className="text-white">{deleteModalVenture.name}</strong> and all associated configuration.
            </p>
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-2">
                Type "{deleteModalVenture.name}" to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={e => setDeleteConfirmInput(e.target.value)}
                placeholder={deleteModalVenture.name}
                className="w-full h-11 px-4 bg-[#09090b] border border-white/[0.1] rounded-xl text-[13.5px] font-medium text-white focus:outline-none focus:border-white/[0.2] transition-colors"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setDeleteModalVenture(null); setDeleteConfirmInput(''); }} disabled={deleting} className="px-5 h-10 text-[13.5px] font-bold text-zinc-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirmDelete} disabled={deleting || deleteConfirmInput.trim() !== deleteModalVenture.name.trim()} className="px-5 h-10 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-[13.5px] disabled:opacity-50 transition-colors flex items-center gap-2">
                {deleting ? <><CircleNotch size={14} className="animate-spin" /> Deleting</> : 'Delete venture'}
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateVentureLandingModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   SOLID GRADIENT INFO PANELS (Light Orange/Amber)
────────────────────────────────────────────────────────────── */

function InfoPanel({ title, text, linkText, linkHref, icon: Icon }: any) {
  return (
    <div className="relative p-6 rounded-2xl bg-gradient-to-br from-[#fb923c] to-[#ea580c] shadow-[0_8px_30px_rgba(234,88,12,0.15)] overflow-hidden w-full">
      <div className="absolute inset-x-0 top-0 h-px bg-white/40 pointer-events-none" />
      
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-black/10 flex items-center justify-center border border-black/5 shadow-inner">
          <Icon size={16} weight="fill" className="text-[#05070D]" />
        </div>
        <p className="text-[11.5px] font-mono uppercase tracking-widest text-[#05070D] font-bold">
          {title}
        </p>
      </div>
      
      <p className="text-[13.5px] text-[#05070D]/90 leading-relaxed mb-5 font-semibold">{text}</p>
      
      <Link href={linkHref} className="text-[13px] font-extrabold text-[#05070D] hover:text-black flex items-center gap-1 group w-fit">
        {linkText}
        <ArrowRight size={12} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  )
}

function ServicesPanel() {
  return (
    <div className="relative p-6 rounded-2xl bg-gradient-to-br from-[#fb923c] to-[#ea580c] shadow-[0_8px_30px_rgba(234,88,12,0.15)] overflow-hidden w-full space-y-4">
      <div className="absolute inset-x-0 top-0 h-px bg-white/40 pointer-events-none" />
      
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-lg bg-black/10 flex items-center justify-center border border-black/5 shadow-inner">
          <SquaresFour size={16} weight="fill" className="text-[#05070D]" />
        </div>
        <p className="text-[11.5px] font-mono uppercase tracking-widest text-[#05070D] font-bold">
          DSRT CONNECT SERVICES
        </p>
      </div>
      
      <p className="text-[13.5px] text-[#05070D]/90 leading-relaxed font-semibold">
        Use the wider DSRT ecosystem to build and grow your venture.
      </p>

      <div className="space-y-3 pt-2">
        <Link href="/looking-for" className="block group">
          <p className="text-[13px] font-extrabold text-[#05070D] group-hover:text-black flex items-center gap-1">Looking For <ArrowRight size={10} weight="bold" className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all"/></p>
          <p className="text-[11.5px] text-[#05070D]/70 font-medium">Find collaborators, contributors and talent.</p>
        </Link>
        <Link href="/projects" className="block group">
          <p className="text-[13px] font-extrabold text-[#05070D] group-hover:text-black flex items-center gap-1">Projects <ArrowRight size={10} weight="bold" className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all"/></p>
          <p className="text-[11.5px] text-[#05070D]/70 font-medium">Show what you are actually building.</p>
        </Link>
        <Link href="/inbox" className="block group">
          <p className="text-[13px] font-extrabold text-[#05070D] group-hover:text-black flex items-center gap-1">DSRT Mail <ArrowRight size={10} weight="bold" className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all"/></p>
          <p className="text-[11.5px] text-[#05070D]/70 font-medium">Communicate with collaborators and contacts.</p>
        </Link>
        <Link href="/coco" className="block group">
          <p className="text-[13px] font-extrabold text-[#05070D] group-hover:text-black flex items-center gap-1">COCO <ArrowRight size={10} weight="bold" className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all"/></p>
          <p className="text-[11.5px] text-[#05070D]/70 font-medium">Plan, research and work across your venture.</p>
        </Link>
      </div>

      <div className="pt-4 mt-2 border-t border-black/10">
        <Link href="/explore" className="text-[13px] font-extrabold text-[#05070D] hover:text-black flex items-center gap-1 group w-fit">
          Explore services
          <ArrowRight size={12} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  )
}

function VentureHorizontalCard({ venture, onDeleteRequest }: { venture: Venture; onDeleteRequest: (v: Venture) => void }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleCardClick = () => {
    router.push(`/ventures/${venture.slug}`)
  }

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${window.location.origin}/ventures/${venture.slug}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied')
    setMenuOpen(false)
  }

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-[#121215] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 flex flex-col md:flex-row gap-6 cursor-pointer transition-all shadow-sm w-full min-w-0"
    >
      <div className="w-full md:w-[220px] h-[160px] md:h-[140px] rounded-xl bg-[#09090b] border border-white/[0.06] overflow-hidden flex-shrink-0 relative">
        {venture.cover_url ? (
          <img src={venture.cover_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900/40">
            <Buildings size={32} className="text-zinc-800" />
          </div>
        )}

        {venture.logo_url && (
          <div className="absolute bottom-3 left-3 w-12 h-12 rounded-xl border border-white/[0.1] shadow-lg bg-[#09090b] overflow-hidden">
            <img src={venture.logo_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 w-full">
        <div className="w-full">
          <div className="flex items-start justify-between gap-4 mb-2 w-full">
            <div className="min-w-0 flex-1">
              <h3 className="text-[18px] font-bold text-white truncate group-hover:text-[#fb923c] transition-colors tracking-tight">
                {venture.name}
              </h3>
              {venture.tagline && (
                <p className="text-[13.5px] text-zinc-400 truncate mt-0.5">{venture.tagline}</p>
              )}
            </div>

            <div className="relative shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                className="w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors"
              >
                <DotsThree size={24} weight="bold" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
                  <div className="absolute right-0 top-full mt-2 z-40 w-48 bg-[#0d0d10] border border-white/[0.08] rounded-xl shadow-2xl p-1.5 space-y-0.5">
                    <button onClick={(e) => { e.stopPropagation(); router.push(`/ventures/${venture.slug}`); }} className="w-full text-left px-3.5 py-2 text-[13px] font-semibold text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors">Open venture</button>
                    <button onClick={(e) => { e.stopPropagation(); router.push(`/ventures/${venture.slug}?tab=settings`); }} className="w-full text-left px-3.5 py-2 text-[13px] font-semibold text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors">Edit venture</button>
                    <button onClick={(e) => { e.stopPropagation(); router.push(`/ventures/${venture.slug}?tab=team`); }} className="w-full text-left px-3.5 py-2 text-[13px] font-semibold text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors">Manage team</button>
                    <button onClick={handleCopyLink} className="w-full text-left px-3.5 py-2 text-[13px] font-semibold text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors">Share venture</button>
                    <div className="h-px bg-white/[0.06] my-1" />
                    <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDeleteRequest(venture); }} className="w-full text-left px-3.5 py-2 text-[13px] font-semibold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">Delete venture</button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-3">
            {venture.industry && <span className="px-2.5 py-1 bg-white/[0.03] border border-white/[0.05] text-zinc-300 text-[11px] rounded-md font-semibold tracking-wide">{venture.industry}</span>}
            {venture.stage && <span className="px-2.5 py-1 bg-[#fb923c]/10 border border-[#fb923c]/20 text-[#fb923c] text-[11px] rounded-md font-bold uppercase tracking-wider">{venture.stage.replace('-', ' ')}</span>}
            {venture.location && <span className="flex items-center gap-1 text-[11.5px] font-medium text-zinc-500 ml-2"><MapPin size={12} /> {venture.location}</span>}
          </div>

          <p className="text-[13px] text-zinc-300 line-clamp-2 leading-relaxed mb-auto">
            {venture.description || 'Provide a concise overview of the problem, product, and mission.'}
          </p>
        </div>

        <div className="mt-5 pt-4 border-t border-white/[0.04] flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[9.5px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-1">Profile</p>
              <p className="text-[12px] font-bold text-white">{venture.profile_completion || 0}% complete</p>
            </div>
            <div>
              <p className="text-[9.5px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-1">Status</p>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${venture.is_draft ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <p className="text-[12px] font-bold text-zinc-300 capitalize">{venture.status || (venture.is_draft ? 'Draft' : 'Active')}</p>
              </div>
            </div>
            <div>
              <p className="text-[9.5px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-1">Team</p>
              <p className="text-[12px] font-bold text-zinc-300 flex items-center gap-1">
                <Users size={14} /> {venture.team_count || 1} member{(venture.team_count || 1) !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); router.push(`/ventures/${venture.slug}`); }}
            className="h-9 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[12.5px] font-bold text-white transition-colors"
          >
            {(venture.profile_completion || 0) < 100 ? 'Continue setup' : 'Open venture'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT: FounderResourcesMarquee (Auto-Scrolling Loop)
────────────────────────────────────────────────────────────── */
function FounderResourcesMarquee({ resources }: { resources: any[] }) {
  const [isPaused, setIsPaused] = useState(false)
  const [duplicated, setDuplicated] = useState<any[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (resources.length > 0) {
      setDuplicated([...resources, ...resources, ...resources])
    }
  }, [resources])

  useEffect(() => {
    fetch('/api/resources/save')
      .then(r => r.json())
      .then(d => setSavedIds(new Set(d.saved || [])))
      .catch(() => {})
  }, [])

  const handleToggleSave = async (resourceId: string, isSaved: boolean) => {
    setSavedIds(prev => {
      const next = new Set(prev)
      if (isSaved) next.delete(resourceId)
      else next.add(resourceId)
      return next
    })

    try {
      await fetch('/api/resources/save', {
        method: isSaved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_id: resourceId })
      })
      toast.success(isSaved ? 'Removed from saved' : 'Saved to your library')
    } catch {
      setSavedIds(prev => {
        const next = new Set(prev)
        if (isSaved) next.add(resourceId)
        else next.delete(resourceId)
        return next
      })
      toast.error('Could not update saved status')
    }
  }

  if (resources.length === 0) return null

  return (
    <div className="mt-20 pt-12 border-t border-white/[0.08] w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#121215] border border-white/[0.08] flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img
              src="/dsrt-resources-icon.png"
              alt="DSRT Founders Resource"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h2 className="text-[20px] font-bold text-white tracking-tight">DSRT Founders Resource</h2>
            <p className="text-[14px] text-zinc-500 mt-1 font-medium">Curated essays, playbooks, and rare picks from operators, investors, and researchers.</p>
          </div>
        </div>
        <Link href="/resources" className="text-[13.5px] font-bold text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors shrink-0">
          Explore library <ArrowRight size={12} weight="bold" />
        </Link>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl w-full"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="absolute left-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-r from-[#05070D] to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-l from-[#05070D] to-transparent pointer-events-none" />

        <div
          className="flex gap-5 py-2"
          style={{
            animation: `marquee-scroll ${resources.length * 8}s linear infinite`,
            animationPlayState: isPaused ? 'paused' : 'running',
            width: 'fit-content',
          }}
        >
          {duplicated.map((item, idx) => (
            <ResourceCard
              key={`${item.id}-${idx}`}
              resource={item}
              isSaved={savedIds.has(item.id)}
              onToggleSave={() => handleToggleSave(item.id, savedIds.has(item.id))}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  )
}

function ResourceCard({ resource, isSaved, onToggleSave }: { resource: any; isSaved: boolean; onToggleSave: () => void }) {
  const isFeatured = resource.is_hidden_gem

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleSave()
  }

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex-shrink-0 w-[320px] p-6 bg-[#121215] border border-white/[0.06] hover:border-white/[0.16] rounded-2xl transition-all block relative"
    >
      <button
        onClick={handleSaveClick}
        className={`absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
          isSaved
            ? 'bg-white/[0.08] text-white'
            : 'bg-transparent text-zinc-600 hover:bg-white/[0.06] hover:text-white'
        }`}
        aria-label={isSaved ? 'Remove from saved' : 'Save to library'}
      >
        <BookmarkSimple size={15} weight={isSaved ? 'fill' : 'regular'} />
      </button>

      <div className="flex items-center gap-2.5 mb-4 pr-10">
        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold flex-1 truncate">
          {resource.category}
        </p>
        {isFeatured && (
          <Star size={13} weight="fill" className="text-zinc-400 shrink-0" />
        )}
      </div>

      <p className="text-[15px] font-bold text-white group-hover:text-[#fb923c] transition-colors leading-snug mb-3 line-clamp-2 min-h-[44px]">
        {resource.title}
      </p>

      {resource.description && (
        <p className="text-[12.5px] text-zinc-500 leading-relaxed line-clamp-2 mb-4 font-medium min-h-[36px]">
          {resource.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/[0.04]">
        <p className="text-[12px] text-zinc-400 font-bold truncate">
          {resource.provider}
        </p>
        <ArrowSquareOut size={13} className="text-zinc-600 group-hover:text-white transition-colors" weight="bold" />
      </div>
    </a>
  )
}

function DSRTFooter() {
  return (
    <footer className="mt-24 pt-12 border-t border-white/[0.08] text-[12px] text-zinc-500 w-full">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-white font-bold mb-3">DSRT CONNECT</p>
          <ul className="space-y-2">
            <li><Link href="/about" className="hover:text-zinc-300 transition-colors">About</Link></li>
            <li><Link href="/careers" className="hover:text-zinc-300 transition-colors">Careers</Link></li>
            <li><Link href="/contact" className="hover:text-zinc-300 transition-colors">Contact</Link></li>
            <li><Link href="/blog" className="hover:text-zinc-300 transition-colors">Blog</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-white font-bold mb-3">PLATFORM</p>
          <ul className="space-y-2">
            <li><Link href="/how-it-works" className="hover:text-zinc-300 transition-colors">How it works</Link></li>
            <li><Link href="/security" className="hover:text-zinc-300 transition-colors">Security</Link></li>
            <li><Link href="/trust" className="hover:text-zinc-300 transition-colors">Trust</Link></li>
            <li><Link href="/status" className="hover:text-zinc-300 transition-colors">Status</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-white font-bold mb-3">BUILD</p>
          <ul className="space-y-2">
            <li><Link href="/projects" className="hover:text-zinc-300 transition-colors">Projects</Link></li>
            <li><Link href="/ventures" className="hover:text-zinc-300 transition-colors">Ventures</Link></li>
            <li><Link href="/looking-for" className="hover:text-zinc-300 transition-colors">Looking For</Link></li>
            <li><Link href="/my-communities" className="hover:text-zinc-300 transition-colors">Communities</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-white font-bold mb-3">SUPPORT</p>
          <ul className="space-y-2">
            <li><Link href="/help" className="hover:text-zinc-300 transition-colors">Help Center</Link></li>
            <li><Link href="/support" className="hover:text-zinc-300 transition-colors">Contact support</Link></li>
            <li><Link href="/bugs" className="hover:text-zinc-300 transition-colors">Report a bug</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-white font-bold mb-3">LEGAL</p>
          <ul className="space-y-2">
            <li><Link href="/terms" className="hover:text-zinc-300 transition-colors">Terms</Link></li>
            <li><Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy</Link></li>
            <li><Link href="/privacy" className="hover:text-zinc-300 transition-colors">Data Policy</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-white font-bold mb-3">CONNECT</p>
          <ul className="space-y-2">
            <li><a href="https://x.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">X (Twitter)</a></li>
            <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">LinkedIn</a></li>
            <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">GitHub</a></li>
          </ul>
        </div>
      </div>

      <div className="pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© {new Date().getFullYear()} DSRT Connect. All rights reserved.</p>
        <p className="font-mono text-[10px] sm:text-[11px] text-center sm:text-right">MUMBAI · SAN FRANCISCO · BENGALURU</p>
      </div>
    </footer>
  )
}