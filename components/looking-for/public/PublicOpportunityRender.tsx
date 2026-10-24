'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  CheckCircle, Sparkle, MapPin, Clock, Users, CalendarBlank,
  Briefcase, Target, Paperclip, DownloadSimple, VideoCamera, ImageSquare,
  FilePdf, FileDoc, FileXls, FileZip, File as FileIcon,
} from '@phosphor-icons/react'
import type { TeamUpItem } from '@/types/teamup'
import { REQUEST_TYPE_LABELS, COMMITMENT_LABELS, WORK_MODE_LABELS } from '@/types/teamup'

interface MediaItem {
  id: string
  type: 'image' | 'video' | 'file'
  url: string
  caption: string | null
  caption_html: string | null
  description: string | null
  file_name?: string | null
  file_extension?: string | null
  file_size?: number | null
}

interface Props {
  item: Partial<TeamUpItem> & {
    title: string
    subline?: string | null
    cover_image_url?: string | null
    content_html?: string | null
    source_type?: string
    source_id?: string
  }
  mode?: 'desktop' | 'mobile'
  showApplyPlaceholder?: boolean
}

function formatDeadline(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0) return 'Expired'
  if (days === 0) return 'Closes today'
  if (days === 1) return 'Closes tomorrow'
  if (days < 7) return `${days} days left`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function fileIconFor(ext: string | null | undefined) {
  const e = (ext || '').toLowerCase()
  if (['pdf'].includes(e)) return { Icon: FilePdf, color: 'text-red-400', bg: 'bg-red-500/10' }
  if (['doc', 'docx', 'odt', 'rtf'].includes(e)) return { Icon: FileDoc, color: 'text-blue-400', bg: 'bg-blue-500/10' }
  if (['xls', 'xlsx', 'csv', 'ods'].includes(e)) return { Icon: FileXls, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
  if (['zip', '7z', 'tar', 'gz'].includes(e)) return { Icon: FileZip, color: 'text-amber-400', bg: 'bg-amber-500/10' }
  return { Icon: FileIcon, color: 'text-zinc-400', bg: 'bg-zinc-900' }
}

export function PublicOpportunityRender({ item, mode = 'desktop', showApplyPlaceholder = false }: Props) {
  const typeLabel = item.request_type ? (REQUEST_TYPE_LABELS[item.request_type] || item.request_type) : null
  const context = item.venture || item.project
  const isMobile = mode === 'mobile'
  const isUrgent = item.urgency === 'urgent' || item.urgency === 'high' || item.status === 'closing_soon'
  const deadline = formatDeadline(item.application_deadline)

  const [media, setMedia] = useState<MediaItem[]>([])

  useEffect(() => {
    if (!item.source_id || item.source_type !== 'team_up') return
    let cancelled = false
    fetch(`/api/looking-for/${item.source_id}/media?source=team_up`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setMedia(d.media || []) })
      .catch(() => null)
    return () => { cancelled = true }
  }, [item.source_id, item.source_type])

  const images = media.filter(m => m.type === 'image')
  const videos = media.filter(m => m.type === 'video')
  const files  = media.filter(m => m.type === 'file')

  return (
    <article className={'bg-[#0a0a0a] text-zinc-100 ' + (isMobile ? 'max-w-[420px] mx-auto' : '')}>
      {item.cover_image_url && (
        <div className={'w-full overflow-hidden bg-zinc-950 ' + (isMobile ? 'aspect-[16/9]' : 'aspect-[5/1] rounded-lg border border-zinc-800/60')}>
          <div className="relative w-full h-full">
            <Image src={item.cover_image_url} alt="" fill className="object-cover" sizes={isMobile ? '420px' : '1200px'} priority />
          </div>
        </div>
      )}

      <div className={'px-5 ' + (isMobile ? 'pt-5' : 'max-w-3xl mx-auto pt-8')}>
        {context && (
          <div className="flex items-center gap-2 mb-4">
            <Link
              href={item.venture ? `/ventures/${context.slug}` : `/projects/${context.slug}`}
              className="inline-flex items-center gap-2 group"
            >
              {context.logo_url ? (
                <div className="w-5 h-5 rounded-sm overflow-hidden bg-zinc-800 shrink-0 relative">
                  <Image src={context.logo_url} alt="" fill className="object-cover" sizes="20px" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-sm bg-zinc-800 shrink-0" />
              )}
              <span className="text-[12px] font-semibold uppercase tracking-wider text-zinc-300 group-hover:text-white transition-colors">
                {context.name}
              </span>
              {item.is_verified && <CheckCircle size={11} weight="fill" className="text-blue-400" />}
            </Link>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap mb-3">
          {typeLabel && (
            <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {typeLabel}
            </span>
          )}
          {item.is_featured && (
            <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkle size={9} weight="fill" />
              Featured
            </span>
          )}
          {isUrgent && (
            <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
              {item.status === 'closing_soon' ? 'Closing soon' : 'Urgent'}
            </span>
          )}
        </div>

        <h1 className={'font-semibold tracking-tight text-white leading-tight mb-2 ' + (isMobile ? 'text-[26px]' : 'text-[36px]')}>
          {item.title || 'Untitled opportunity'}
        </h1>

        {item.subline && (
          <p className={'text-zinc-300 leading-relaxed mb-5 ' + (isMobile ? 'text-[14px]' : 'text-[17px]')}>
            {item.subline}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap mb-6">
          {item.employment_type && <MetaChip Icon={Briefcase}>{item.employment_type}</MetaChip>}
          {item.work_mode && <MetaChip Icon={MapPin}>{WORK_MODE_LABELS[item.work_mode] || item.work_mode}</MetaChip>}
          {item.location && !item.work_mode && <MetaChip Icon={MapPin}>{item.location}</MetaChip>}
          {item.location && item.work_mode && item.work_mode !== 'remote' && <MetaChip Icon={MapPin}>{item.location}</MetaChip>}
          {item.commitment && <MetaChip Icon={Clock}>{COMMITMENT_LABELS[item.commitment] || item.commitment}</MetaChip>}
          {item.experience_level && <MetaChip Icon={Target}>{item.experience_level}</MetaChip>}
          {item.positions_open && item.positions_open > 0 && (
            <MetaChip Icon={Users}>
              {item.positions_open} {item.positions_open === 1 ? 'opening' : 'openings'}
            </MetaChip>
          )}
          {deadline && (
            <MetaChip Icon={CalendarBlank} accent={deadline.includes('day') || deadline.includes('today')}>
              {deadline}
            </MetaChip>
          )}
        </div>

        {item.content_html && item.content_html.trim() ? (
          <div
            className="prose prose-invert prose-zinc max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-[22px] prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-[17px] prose-h3:mt-6 prose-h3:mb-2 prose-p:text-[14.5px] prose-p:leading-relaxed prose-p:text-zinc-200 prose-p:my-2 prose-li:text-[14px] prose-li:text-zinc-200 prose-strong:text-white prose-code:text-blue-300 prose-code:bg-zinc-900 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px] prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:my-4 prose-blockquote:border-l-2 prose-blockquote:border-zinc-700 prose-blockquote:italic prose-blockquote:text-zinc-400"
            dangerouslySetInnerHTML={{ __html: item.content_html }}
          />
        ) : (
          <div className="text-[13.5px] text-zinc-500 italic">No description yet.</div>
        )}

        {/* Media gallery */}
        {(images.length > 0 || videos.length > 0) && (
          <div className="mt-8">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-3">
              Media
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {images.map(m => (
                <figure key={m.id} className="rounded-lg overflow-hidden border border-zinc-800/80 bg-zinc-950">
                  <div className="relative aspect-video bg-zinc-900">
                    <Image src={m.url} alt={m.caption || ''} fill className="object-cover" sizes="600px" />
                  </div>
                  {m.caption && (
                    <figcaption className="p-3 text-[12.5px] text-zinc-300 leading-relaxed">
                      {m.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
              {videos.map(m => (
                <figure key={m.id} className="rounded-lg overflow-hidden border border-zinc-800/80 bg-zinc-950">
                  <video src={m.url} controls className="w-full aspect-video bg-zinc-900" />
                  {m.caption && (
                    <figcaption className="p-3 text-[12.5px] text-zinc-300 leading-relaxed">
                      {m.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        )}

        {/* Attachments */}
        {files.length > 0 && (
          <div className="mt-8">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-3">
              Attachments
            </div>
            <div className="space-y-2">
              {files.map(f => {
                const meta = fileIconFor(f.file_extension)
                return (
                  <a
                    key={f.id}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-950 hover:border-zinc-600 group"
                  >
                    <div className={'w-10 h-10 rounded-md flex items-center justify-center shrink-0 ' + meta.bg + ' ' + meta.color}>
                      <meta.Icon size={18} weight="regular" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium text-zinc-100 truncate group-hover:text-white">
                        {f.file_name || 'File'}
                      </div>
                      <div className="flex items-center gap-2 text-[11.5px] text-zinc-500 mt-0.5">
                        {f.file_extension && <span className="uppercase font-mono">{f.file_extension}</span>}
                        {f.file_size && (
                          <>
                            <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
                            <span>{formatBytes(f.file_size)}</span>
                          </>
                        )}
                        {f.caption && (
                          <>
                            <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
                            <span className="truncate max-w-xs">{f.caption}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <DownloadSimple size={13} weight="regular" className="text-zinc-500 group-hover:text-zinc-200 shrink-0" />
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {item.required_skills && item.required_skills.length > 0 && (
          <div className="mt-8">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-2.5">
              Required skills
            </div>
            <div className="flex flex-wrap gap-1.5">
              {item.required_skills.map(s => (
                <span key={s} className="inline-flex items-center h-7 px-2.5 rounded text-[12px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-200">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {item.nice_to_have_skills && item.nice_to_have_skills.length > 0 && (
          <div className="mt-6">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-2.5">
              Nice to have
            </div>
            <div className="flex flex-wrap gap-1.5">
              {item.nice_to_have_skills.map(s => (
                <span key={s} className="inline-flex items-center h-7 px-2.5 rounded text-[12px] font-medium border border-zinc-800 text-zinc-400">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {showApplyPlaceholder && (
          <div className="mt-10 pt-6 border-t border-zinc-800/60">
            <button className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-white text-black text-[13.5px] font-semibold cursor-not-allowed opacity-70">
              Apply
            </button>
            <div className="mt-2 text-[11px] text-zinc-500">
              This is a preview. The apply button will work on the published page.
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

function MetaChip({
  Icon, children, accent,
}: {
  Icon: any
  children: React.ReactNode
  accent?: boolean
}) {
  return (
    <span className={
      'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-[12px] ' +
      (accent
        ? 'border-orange-500/30 bg-orange-500/5 text-orange-300'
        : 'border-zinc-800 bg-zinc-950 text-zinc-300')
    }>
      <Icon size={11} weight="regular" />
      <span className="capitalize">{typeof children === 'string' ? children.replace(/_/g, ' ') : children}</span>
    </span>
  )
}
