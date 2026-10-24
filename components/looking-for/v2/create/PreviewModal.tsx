'use client'

import { useEffect } from 'react'
import { X } from '@phosphor-icons/react'

interface Props {
  draft: any
  onClose: () => void
}

export function PreviewModal({ draft, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const blocks = draft?.content_blocks || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      <div
        className="relative w-full max-w-4xl max-h-[92vh] rounded-2xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden flex flex-col shadow-[0_20px_80px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">Live preview</div>
            <div className="text-[13px] font-semibold text-white mt-0.5">
              This is how applicants will see your opportunity
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-10 py-10">
          {/* Title + subtitle preview */}
          <h1 className="text-[36px] font-bold text-white leading-tight tracking-tight mb-3">
            {draft?.title || 'Untitled opportunity'}
          </h1>
          {draft?.subtitle && (
            <p className="text-[16px] text-zinc-400 leading-relaxed mb-8">
              {draft.subtitle}
            </p>
          )}

          {/* Blocks preview */}
          <div className="space-y-3">
            {blocks.map((block: any) => (
              <BlockPreview key={block.id} block={block} />
            ))}
          </div>

          {blocks.length === 0 && (
            <p className="text-[13px] text-zinc-500 italic">No content added yet.</p>
          )}

          {/* Required skills */}
          {draft?.required_skills && draft.required_skills.length > 0 && (
            <div className="mt-10">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-3">Required skills</h3>
              <div className="flex flex-wrap gap-2">
                {draft.required_skills.map((s: string) => (
                  <span key={s} className="inline-flex items-center h-7 px-2.5 rounded-md text-[12px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-200">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BlockPreview({ block }: { block: any }) {
  switch (block.type) {
    case 'heading1':
      return <h2 className="text-[26px] font-bold text-white leading-tight mt-6">{block.content}</h2>
    case 'heading2':
      return <h3 className="text-[20px] font-bold text-white leading-snug mt-5">{block.content}</h3>
    case 'heading3':
      return <h4 className="text-[16px] font-bold text-white leading-snug mt-4">{block.content}</h4>
    case 'bulleted-list':
      return <div className="flex items-start gap-2"><span className="text-zinc-500 mt-1.5">•</span><span className="text-[14.5px] text-zinc-300 leading-relaxed">{block.content}</span></div>
    case 'quote':
      return <div className="pl-4 border-l-2 border-zinc-700 my-4"><p className="text-[15px] text-zinc-300 italic leading-relaxed">{block.content}</p></div>
    case 'code':
      return <div className="my-4 rounded-md bg-zinc-950 border border-zinc-800 p-3 font-mono"><pre className="text-[13px] text-emerald-400 leading-relaxed whitespace-pre-wrap">{block.content}</pre></div>
    case 'divider':
      return <hr className="border-zinc-800 my-6" />
    case 'image':
      return block.url ? <img src={block.url} alt="" className="rounded-lg my-4 max-w-full" /> : null
    case 'paragraph':
    default:
      return <p className="text-[15px] text-zinc-300 leading-[1.7]">{block.content}</p>
  }
}