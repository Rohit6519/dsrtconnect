'use client'

import { useState } from 'react'
import { useStudio } from '../../StudioContext'
import { X, DeviceMobile, Monitor, Article, ArrowUpRight } from '@phosphor-icons/react'

export function StudioPreview({ onClose }: { onClose: () => void }) {
  const { draft } = useStudio()
  const [mode, setMode] = useState<'public' | 'card' | 'mobile'>('public')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="w-full max-w-6xl max-h-[92vh] rounded-2xl border border-zinc-800 bg-[#0a0a0b] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 shrink-0">
          <div className="text-[13px] font-bold text-white">Preview</div>
          
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
            <PreviewTabBtn active={mode === 'public'} onClick={() => setMode('public')} icon={<Monitor size={12} />} label="Public Page" />
            <PreviewTabBtn active={mode === 'card'} onClick={() => setMode('card')} icon={<Article size={12} />} label="Feed Card" />
            <PreviewTabBtn active={mode === 'mobile'} onClick={() => setMode('mobile')} icon={<DeviceMobile size={12} />} label="Mobile" />
          </div>
          
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto bg-zinc-950 p-6 flex justify-center">
          <div className={
            mode === 'mobile' ? 'w-full max-w-sm' : mode === 'card' ? 'w-full max-w-md' : 'w-full max-w-3xl'
          }>
            {mode === 'card' ? <FeedCardPreview /> : <PublicPagePreview />}
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewTabBtn({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={
        'inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11.5px] font-semibold transition-colors ' +
        (active ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300')
      }
    >
      {icon} {label}
    </button>
  )
}

function PublicPagePreview() {
  const { draft } = useStudio()
  const opp = draft.opportunity
  const skills = draft.skill_requirements || []
  const questions = draft.application_questions || []

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0b] p-6 md:p-8 text-zinc-100">
      {/* Header */}
      <div className="mb-6">
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-blue-400 mb-2">
          {String(opp.opportunity_type || '').replace(/-/g, ' ')}
        </div>
        <h1 className="text-[26px] font-bold text-white leading-tight mb-2">
          {opp.title || 'Untitled opportunity'}
        </h1>
        {opp.subtitle && (
          <p className="text-[14px] text-zinc-400">{opp.subtitle}</p>
        )}
      </div>

      {/* Meta strip */}
      <div className="flex flex-wrap gap-2 mb-6">
        {opp.work_mode && (
          <span className="h-6 px-2 rounded-md border border-zinc-800 bg-zinc-900 text-[11px] text-zinc-300 capitalize inline-flex items-center">
            {opp.work_mode}
          </span>
        )}
        {opp.time_commitment && (
          <span className="h-6 px-2 rounded-md border border-zinc-800 bg-zinc-900 text-[11px] text-zinc-300 inline-flex items-center">
            {opp.time_commitment.replace(/-/g, ' ')}
          </span>
        )}
        {opp.project_length && (
          <span className="h-6 px-2 rounded-md border border-zinc-800 bg-zinc-900 text-[11px] text-zinc-300 inline-flex items-center">
            {opp.project_length.replace(/-/g, ' ')}
          </span>
        )}
        {opp.experience_level && opp.experience_level !== 'any' && (
          <span className="h-6 px-2 rounded-md border border-zinc-800 bg-zinc-900 text-[11px] text-zinc-300 inline-flex items-center capitalize">
            {opp.experience_level}
          </span>
        )}
      </div>

      {/* Description */}
      {(opp.content_text || opp.description) && (
        <div className="prose prose-invert prose-sm max-w-none mb-6">
          <p className="text-[14px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {opp.content_text || opp.description}
          </p>
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-3">Required Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {skills.filter((s: any) => s.priority === 'required').map((s: any) => (
              <span key={s.id} className="h-7 px-3 rounded-lg border border-red-500/25 bg-red-500/[0.08] text-red-300 text-[12px] font-medium inline-flex items-center">
                {s.skill_name}
              </span>
            ))}
            {skills.filter((s: any) => s.priority === 'preferred').map((s: any) => (
              <span key={s.id} className="h-7 px-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.08] text-amber-300 text-[12px] font-medium inline-flex items-center">
                {s.skill_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Media */}
      {draft.media && draft.media.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-3">Attachments</h3>
          <div className="grid grid-cols-2 gap-3">
            {draft.media.slice(0, 4).map((m: any) => (
              <div key={m.id} className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden h-24">
                {m.media_type === 'image' ? (
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500 text-[11px]">
                    {m.filename}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Apply Button */}
      <div className="mt-8 pt-6 border-t border-zinc-800 flex items-center justify-between">
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">Compensation</div>
          <div className="text-[16px] font-bold text-white mt-0.5 capitalize">
            {formatComp(opp)}
          </div>
        </div>
        <button className="h-11 px-6 rounded-xl bg-white text-black font-bold text-[13px] shadow-[0_2px_16px_rgba(255,255,255,0.1)]">
          Apply Now
        </button>
      </div>

      {questions.length > 0 && (
        <div className="mt-4 text-[11px] text-zinc-500">
          {questions.length} custom question{questions.length !== 1 ? 's' : ''} to answer during application.
        </div>
      )}
    </div>
  )
}

function FeedCardPreview() {
  const { draft } = useStudio()
  const opp = draft.opportunity
  const skills = draft.skill_requirements || []

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-5 hover:border-zinc-600 transition-colors cursor-pointer group">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-400">
          {String(opp.opportunity_type || '').replace(/-/g, ' ')}
        </span>
        <span className="text-zinc-700">·</span>
        <span className="text-[10.5px] font-mono text-zinc-500">{opp.opportunity_number}</span>
      </div>
      <h3 className="text-[16px] font-bold text-white leading-tight mb-1 flex items-center gap-1.5 group-hover:text-blue-300">
        {opp.title || 'Untitled'}
        <ArrowUpRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400" />
      </h3>
      {opp.subtitle && (
        <p className="text-[12.5px] text-zinc-400 line-clamp-2 mb-3">{opp.subtitle}</p>
      )}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {skills.slice(0, 3).map((s: any) => (
          <span key={s.id} className="h-5 px-1.5 rounded bg-zinc-900 border border-zinc-800 text-[10.5px] font-medium text-zinc-400">
            {s.skill_name}
          </span>
        ))}
        {skills.length > 3 && (
          <span className="h-5 px-1.5 rounded bg-zinc-900 border border-zinc-800 text-[10.5px] font-medium text-zinc-500">
            +{skills.length - 3}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-[11px] text-zinc-500">
        <span className="capitalize">{opp.work_mode || 'remote'}</span>
        {opp.time_commitment && (
          <>
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
            <span>{opp.time_commitment.replace(/-/g, ' ')}</span>
          </>
        )}
        <span className="w-1 h-1 rounded-full bg-zinc-700" />
        <span className="text-emerald-400 font-semibold">{formatComp(opp)}</span>
      </div>
    </div>
  )
}

function formatComp(opp: any): string {
  const type = opp.compensation_type
  if (!type || type === 'unpaid') return 'Unpaid'
  if (type === 'collaboration') return 'Collaboration'
  if (type === 'equity') return opp.equity_min ? `${opp.equity_min}%–${opp.equity_max}% Equity` : 'Equity'
  const curr = opp.compensation_currency === 'USD' ? '$' : opp.compensation_currency || ''
  if (opp.compensation_min || opp.compensation_max) {
    const min = opp.compensation_min ? `${curr}${opp.compensation_min.toLocaleString()}` : ''
    const max = opp.compensation_max ? `${curr}${opp.compensation_max.toLocaleString()}` : ''
    let p = ''
    if (type === 'hourly') p = '/hr'
    else if (type === 'monthly') p = '/mo'
    else if (type === 'annual') p = '/yr'
    return `${min}${max ? ` – ${max}` : ''}${p}`
  }
  return type.replace(/-/g, ' ')
}