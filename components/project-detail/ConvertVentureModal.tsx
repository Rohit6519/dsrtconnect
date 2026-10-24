'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Rocket, Buildings, CheckCircle, CircleNotch, X, ArrowRight } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Props {
  project: {
    id: string
    slug: string
    name: string
    parent_venture_id?: string | null
  }
  onClose: () => void
}

export function ConvertVentureModal({ project, onClose }: Props) {
  const router = useRouter()
  const [ventureName, setVentureName] = useState(project.name)
  const [converting, setConverting] = useState(false)

  const handleConvert = async () => {
    if (!ventureName.trim()) {
      toast.error('Venture name is required')
      return
    }

    setConverting(true)
    try {
      const res = await fetch(`/api/projects/${project.slug}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venture_name: ventureName.trim() }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success('Project successfully graduated to a Venture!')
      router.push(`/ventures/${data.venture.slug}`)
    } catch (e: any) {
      toast.error(e.message || 'Conversion failed')
      setConverting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-[#121215] border border-white/[0.1] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-white">
              <Rocket size={16} weight="fill" />
            </div>
            <h2 className="text-[16px] font-bold text-white">Graduate to Venture</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-[13.5px] text-zinc-300 leading-relaxed mb-4">
              You are about to graduate <strong className="text-white">{project.name}</strong> from a technical project into a full business venture.
            </p>
            
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle size={16} weight="fill" className="text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-[12.5px] text-zinc-400"><strong className="text-white block mb-0.5">Project history is preserved</strong> Your repository, technical milestones, and knowledge base remain exactly as they are.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={16} weight="fill" className="text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-[12.5px] text-zinc-400"><strong className="text-white block mb-0.5">Unlocks business features</strong> Access the 10-step venture assessment, cap table tooling, funding stages, and investor matching.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={16} weight="fill" className="text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-[12.5px] text-zinc-400"><strong className="text-white block mb-0.5">Graph connection</strong> This project will become a sub-entity belonging to your new Venture.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold mb-2">
              Official Venture Name
            </label>
            <div className="relative">
              <Buildings size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={ventureName}
                onChange={e => setVentureName(e.target.value)}
                placeholder="e.g., Acme Corp"
                className="w-full h-11 pl-10 pr-4 bg-[#09090b] border border-zinc-800 rounded-xl text-[14px] text-white focus:outline-none focus:border-zinc-500 transition-colors"
                autoFocus
              />
            </div>
            <p className="text-[11.5px] text-zinc-500 mt-2">
              You can use the project name or provide the official company name.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-white/[0.06] bg-black/20">
          <button
            onClick={onClose}
            disabled={converting}
            className="px-4 h-9 text-[12.5px] font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConvert}
            disabled={converting || !ventureName.trim()}
            className="px-5 h-9 bg-white text-black hover:bg-zinc-200 font-bold rounded-lg text-[12.5px] disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {converting ? (
              <><CircleNotch size={14} className="animate-spin" /> Converting...</>
            ) : (
              <>Graduate Venture <ArrowRight size={13} weight="bold" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}