'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Wrench, Trash } from '@phosphor-icons/react'

interface DraftCardProps {
  project: {
    id: string
    slug: string
    name: string
    status?: string
    project_number?: string | null
    icon?: string | null
    cover_image_url?: string | null
    updated_at?: string | null
    created_at?: string | null
  }
  onDeleteRequest?: (project: any) => void
}

function timeAgo(iso?: string | null): string {
  if (!iso) return ''
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function ProjectDraftCard({ project, onDeleteRequest }: DraftCardProps) {
  const router = useRouter()

  return (
    <div
      onClick={() => router.push(`/projects/create?continue=${project.slug}`)}
      className="w-[260px] flex-shrink-0 bg-[#121215] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/20 transition-all cursor-pointer group shadow-sm relative"
    >
      <div className="relative h-[110px] overflow-hidden bg-zinc-900/60 border-b border-white/[0.04]">
        {project.cover_image_url ? (
          <img src={project.cover_image_url} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Wrench size={26} weight="fill" className="text-white/10" /></div>
        )}
        <span className="absolute top-3 left-3 text-[9px] font-extrabold text-black bg-white px-2 py-1 rounded-md uppercase tracking-widest shadow-sm">
          Draft
        </span>

        {/* Delete Button */}
        {onDeleteRequest && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDeleteRequest({ ...project, status: 'draft' })
            }}
            className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-black/40 border border-white/10 text-white/50 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 flex items-center justify-center backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
          >
            <Trash size={14} weight="bold" />
          </button>
        )}
      </div>
      <div className="p-5">
        <h4 className="text-[14.5px] font-bold text-white truncate mb-1">{project.name}</h4>
        {project.project_number && (
          <p className="text-[11px] text-zinc-500 font-mono font-medium mb-3">{project.project_number}</p>
        )}
        <p className="text-[11px] text-zinc-500 mb-4 font-medium flex items-center gap-1">
          Edited {timeAgo(project.updated_at || project.created_at)}
        </p>
        <button className="w-full flex items-center justify-center gap-1.5 text-[12.5px] font-bold text-zinc-300 bg-white/[0.04] border border-white/[0.06] group-hover:bg-white group-hover:text-[#05070D] px-3 h-10 rounded-xl transition-colors">
          Continue building <ArrowRight size={12} weight="bold" />
        </button>
      </div>
    </div>
  )
}