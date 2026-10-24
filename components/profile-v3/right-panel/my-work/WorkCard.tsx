'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { RichEditorLite } from '../../shared/RichEditorLite'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Code, Rocket, Star, Users, TrendUp, ArrowSquareOut, Buildings, Sparkle,
  PencilSimple, FloppyDisk, X, FileArrowDown, Upload, FileIcon, Spinner
} from '@phosphor-icons/react'

export interface WorkItem {
  id: string
  _type: 'project' | 'venture'
  _role?: string
  name: string
  slug: string
  tagline?: string | null
  description?: string | null
  stage?: string | null
  status?: string | null
  is_featured?: boolean
  cover_image_url?: string | null
  logo_url?: string | null
  tech_stack?: string[] | null
  industry?: string | null
  sector?: string | null
  traction_score?: number | null
  follower_count?: number | null
  progress_percent?: number | null
  created_at?: string
  updated_at?: string
  _story?: {
    story_html: string | null
    attachments: any[]
  } | null
}

const STAGE_COLORS: Record<string, string> = {
  idea: 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60',
  prototype: 'bg-blue-500/20 text-blue-200 border-blue-500/40',
  mvp: 'bg-purple-500/20 text-purple-200 border-purple-500/40',
  beta: 'bg-orange-500/20 text-orange-200 border-orange-500/40',
  launched: 'bg-green-500/20 text-green-200 border-green-500/40',
  scaling: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/40',
  pre_seed: 'bg-blue-500/20 text-blue-200 border-blue-500/40',
  seed: 'bg-purple-500/20 text-purple-200 border-purple-500/40',
  series_a: 'bg-orange-500/20 text-orange-200 border-orange-500/40',
  series_b: 'bg-green-500/20 text-green-200 border-green-500/40',
  growth: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/40',
  bootstrapped: 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40',
  active: 'bg-green-500/20 text-green-200 border-green-500/40',
}

function stageStyle(stage?: string | null): string {
  const key = (stage || '').toLowerCase().replace(/\s+/g, '_')
  return STAGE_COLORS[key] || STAGE_COLORS.idea
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

interface WorkCardProps {
  item: WorkItem
  viewMode: 'grid' | 'list'
  isOwner: boolean
}

export function WorkCard({ item, viewMode, isOwner }: WorkCardProps) {
  const isProject = item._type === 'project'
  const href = isProject ? `/projects/${item.slug}` : `/ventures/${item.slug}`
  const Icon = isProject ? Code : Rocket
  const coverImg = isProject ? item.cover_image_url : null
  const logoImg = isProject ? null : item.logo_url
  const headerImg = coverImg || logoImg

  // Story state
  const [isEditingStory, setIsEditingStory] = useState(false)
  const [storyHtml, setStoryHtml] = useState(item._story?.story_html || '')
  const [attachments, setAttachments] = useState<any[]>(item._story?.attachments || [])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasStoryContent = !!(storyHtml.trim() || attachments.length > 0)

  const saveStory = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile/my-work/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: item._type,
          entity_id: item.id,
          story_html: storyHtml,
          attachments,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Notes saved')
      setIsEditingStory(false)
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    
    const newAttachments = [...attachments]
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await fetch('/api/profile/featured-work/upload', { method: 'POST', body: fd })
        if (res.ok) {
          const data = await res.json()
          newAttachments.push({
            url: data.url,
            filename: data.filename,
            file_size: data.file_size,
            media_type: data.media_type
          })
        }
      } catch {}
    }
    setAttachments(newAttachments)
    setUploading(false)
    e.target.value = ''
  }

  const downloadFile = async (url: string, filename: string) => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename || 'download'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
      toast.success('Downloaded')
    } catch {
      toast.error('Download failed')
    }
  }

  // Basic card UI
  const BasicCard = (
    <Link
      href={href}
      className={cn(
        'flex flex-col bg-gradient-to-b from-zinc-900/50 via-zinc-950/50 to-zinc-950/80 border border-zinc-800/60 rounded-2xl shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_2px_12px_rgba(0,0,0,0.3)] hover:border-zinc-700/80 hover:-translate-y-[2px] transition-all duration-200 overflow-hidden group',
        viewMode === 'list' ? 'flex-shrink-0 w-[300px]' : 'w-full'
      )}
    >
      {/* Cover */}
      <div className="relative h-28 overflow-hidden">
        {headerImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={headerImg} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
            <Icon className="w-8 h-8 text-zinc-700" weight="fill" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
        {item.is_featured && (
          <span className="absolute top-2 left-2 flex items-center gap-1 text-[9px] px-2 py-0.5 bg-yellow-400 text-black rounded-md font-bold uppercase tracking-wider shadow-lg">
            <Star className="w-2.5 h-2.5" weight="fill" /> Featured
          </span>
        )}
        {item.stage && (
          <span className={cn('absolute top-2 right-2 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border backdrop-blur-md shadow-lg', stageStyle(item.stage))}>
            {item.stage.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start gap-2 mb-1.5">
          <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', isProject ? 'text-purple-400' : 'text-orange-400')} weight="fill" />
          <div className="flex-1 min-w-0">
            <h3 className="text-[14.5px] font-bold text-zinc-50 tracking-tight truncate leading-tight">{item.name}</h3>
          </div>
        </div>
        {item.tagline && <p className="text-[12px] text-zinc-400 line-clamp-2 leading-[1.5] mb-3 flex-1">{item.tagline}</p>}
        
        {/* Footer */}
        <div className="flex items-center gap-2.5 pt-3 border-t border-zinc-800/50 flex-wrap mt-auto">
          {item._role === 'founder' && (
            <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold uppercase tracking-wider">
              <Sparkle className="w-2.5 h-2.5" weight="fill" /> Founder
            </span>
          )}
          {(item.industry || item.sector) && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-500 truncate">
              <Buildings className="w-3 h-3 flex-shrink-0" weight="duotone" />
              <span className="truncate">{item.industry || item.sector}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  )

  // In Grid mode, we just show the card. The "Story" feature is best viewed in List mode side-by-side.
  if (viewMode === 'grid') return BasicCard

  // ── LIST MODE: Side-by-side Layout ────────────────────────────────────
  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/40">
      {BasicCard}

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[12px] font-bold text-zinc-400 uppercase tracking-wider">My Contribution & Notes</h4>
          {isOwner && !isEditingStory && (
            <button
              onClick={() => setIsEditingStory(true)}
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <PencilSimple className="w-3 h-3" weight="bold" />
              {hasStoryContent ? 'Edit' : 'Add Notes'}
            </button>
          )}
        </div>

        {isEditingStory ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col flex-1">
            <div className="flex-1 overflow-y-auto p-2">
              <RichEditorLite
                value={storyHtml}
                onChange={setStoryHtml}
                placeholder="What was your role? What did you build? Add any specific insights..."
                minHeight="120px"
                className="border-none"
              />
              
              {/* Attachments Editor */}
              <div className="mt-3 pt-3 border-t border-zinc-800/60">
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 px-2 py-1.5 rounded-lg text-[11px]">
                      <FileIcon className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="truncate max-w-[120px] text-zinc-300">{att.filename}</span>
                      <button onClick={() => setAttachments(cur => cur.filter((_, idx) => idx !== i))} className="text-zinc-500 hover:text-red-400">
                        <X className="w-3 h-3" weight="bold" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 bg-zinc-900 border border-dashed border-zinc-700 px-3 py-1.5 rounded-lg text-[11px] text-zinc-400 hover:text-zinc-200">
                    {uploading ? <Spinner className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploading ? 'Uploading...' : 'Add File'}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-2 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditingStory(false)} className="h-7 text-xs bg-transparent border-zinc-700 text-zinc-400">Cancel</Button>
              <Button size="sm" onClick={saveStory} disabled={saving || uploading} className="h-7 text-xs bg-white text-black hover:bg-zinc-100">
                <FloppyDisk className="w-3.5 h-3.5 mr-1" weight="bold" /> Save
              </Button>
            </div>
          </div>
        ) : hasStoryContent ? (
          <div className="flex-1 flex flex-col">
            <div 
              className={cn(
                'text-[13px] text-zinc-300 leading-relaxed mb-3',
                '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
                '[&_a]:text-blue-400 [&_a]:underline'
              )}
              dangerouslySetInnerHTML={{ __html: storyHtml }} 
            />
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-auto pt-3 border-t border-zinc-800/40">
                {attachments.map((att, i) => (
                  <button
                    key={i}
                    onClick={() => downloadFile(att.url, att.filename)}
                    className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 px-2.5 py-1.5 rounded-lg text-[11px] hover:bg-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <FileArrowDown className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="truncate max-w-[150px] text-zinc-300 font-medium">{att.filename}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800/60 rounded-xl p-6 text-center">
            <p className="text-[12px] text-zinc-500 italic mb-2">No personal notes or attachments added.</p>
            {isOwner && (
              <button onClick={() => setIsEditingStory(true)} className="text-[11px] font-semibold text-zinc-400 hover:text-white px-3 py-1.5 bg-zinc-900 rounded-lg">
                + Add your contribution
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}