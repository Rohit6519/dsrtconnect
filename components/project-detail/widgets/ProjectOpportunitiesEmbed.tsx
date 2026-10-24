'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Briefcase, Plus, MapPin, Clock, ArrowRight, X, CircleNotch } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Opportunity {
  id: string
  title: string
  tagline?: string | null
  description?: string | null
  commitment?: string | null
  work_mode?: string | null
  required_skills?: string[] | null
  created_at: string
  slug: string
}

interface Props {
  slug: string
  isOwner: boolean
}

export function ProjectOpportunitiesEmbed({ slug, isOwner }: Props) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [commitment, setCommitment] = useState('part-time')
  const [workMode, setWorkMode] = useState('remote')
  const [creating, setCreating] = useState(false)

  const loadOpportunities = () => {
    setLoading(true)
    fetch(`/api/projects/${slug}/opportunities`)
      .then(r => r.json())
      .then(d => setOpportunities(d.opportunities || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadOpportunities()
  }, [slug])

  const handleCreateRole = async () => {
    if (!title.trim()) {
      toast.error('Role title is required')
      return
    }

    setCreating(true)
    try {
      const res = await fetch(`/api/projects/${slug}/opportunities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          commitment,
          work_mode: workMode,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success('Role created and published to Looking For!')
      setModalOpen(false)
      setTitle('')
      setDescription('')
      loadOpportunities()
    } catch (e: any) {
      toast.error(e.message || 'Failed to create role')
    } fontally: {
      setCreating(false)
    }
  }

  if (!loading && opportunities.length === 0 && !isOwner) return null

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden mb-6">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Briefcase size={16} weight="fill" className="text-purple-400" />
          <h3 className="text-[15px] font-semibold text-white">Open Roles & Collaborations</h3>
          {opportunities.length > 0 && (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
              {opportunities.length} Open
            </span>
          )}
        </div>

        {isOwner && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white text-black hover:bg-zinc-200 text-[12px] font-bold transition-colors"
          >
            <Plus size={12} weight="bold" /> Post Open Role
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-16 w-full bg-white/[0.04] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="p-8 text-center space-y-2">
          <p className="text-[13px] text-zinc-400">No open roles posted for this project.</p>
          {isOwner && (
            <p className="text-[11.5px] text-zinc-500">
              Post roles to find contributors, engineers, or co-founders via DSRT Looking For.
            </p>
          )}
        </div>
      ) : (
        <div className="divide-y divide-white/[0.05]">
          {opportunities.map(opp => (
            <div key={opp.id} className="p-5 hover:bg-white/[0.02] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <Link
                  href={`/looking-for/${opp.id}`}
                  className="text-[15px] font-bold text-white hover:text-purple-300 transition-colors inline-flex items-center gap-1.5"
                >
                  {opp.title}
                  <ArrowRight size={12} />
                </Link>
                {opp.description && (
                  <p className="text-[12.5px] text-zinc-400 line-clamp-1">{opp.description}</p>
                )}
                <div className="flex items-center gap-3 text-[11px] text-zinc-500 pt-1">
                  {opp.commitment && <span className="capitalize flex items-center gap-1"><Clock size={10} /> {opp.commitment}</span>}
                  {opp.work_mode && <span className="capitalize flex items-center gap-1"><MapPin size={10} /> {opp.work_mode}</span>}
                </div>
              </div>

              <Link
                href={`/looking-for/${opp.id}`}
                className="h-8 px-4 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-white text-[12px] font-semibold inline-flex items-center justify-center shrink-0 transition-colors"
              >
                View & Apply
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Role Creation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-[#121215] border border-white/[0.1] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-[16px] font-bold text-white">Post Open Role</h3>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                  Role Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Lead Machine Learning Engineer"
                  className="w-full h-10 px-3 bg-[#09090b] border border-zinc-800 rounded-lg text-[13px] text-white focus:outline-none focus:border-zinc-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                  Role Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe responsibilities and what you're looking for..."
                  rows={3}
                  className="w-full p-3 bg-[#09090b] border border-zinc-800 rounded-lg text-[13px] text-white focus:outline-none focus:border-zinc-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                    Commitment
                  </label>
                  <select
                    value={commitment}
                    onChange={e => setCommitment(e.target.value)}
                    className="w-full h-10 px-3 bg-[#09090b] border border-zinc-800 rounded-lg text-[13px] text-white focus:outline-none focus:border-zinc-500"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="contributor">Open Contributor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                    Work Mode
                  </label>
                  <select
                    value={workMode}
                    onChange={e => setWorkMode(e.target.value)}
                    className="w-full h-10 px-3 bg-[#09090b] border border-zinc-800 rounded-lg text-[13px] text-white focus:outline-none focus:border-zinc-500"
                  >
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="on-site">On-site</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => setModalOpen(false)}
                disabled={creating}
                className="px-4 h-9 text-[12.5px] font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRole}
                disabled={creating || !title.trim()}
                className="px-4 h-9 bg-white text-black font-bold rounded-lg text-[12.5px] hover:bg-zinc-200 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {creating ? <CircleNotch size={14} className="animate-spin" /> : 'Publish Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}