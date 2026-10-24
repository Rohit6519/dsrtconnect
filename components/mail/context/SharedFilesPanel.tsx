'use client'

import { FilePdf, File as FileIcon, Image as ImageIcon, VideoCamera, FileText, DownloadSimple } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface Props {
  messages: any[]
}

function fileMeta(type: string) {
  if (type.startsWith('image/')) return { icon: ImageIcon, color: 'text-emerald-400' }
  if (type.startsWith('video/')) return { icon: VideoCamera, color: 'text-amber-400' }
  if (type === 'application/pdf') return { icon: FilePdf, color: 'text-red-400' }
  if (type.includes('word') || type.includes('document')) return { icon: FileText, color: 'text-blue-400' }
  return { icon: FileIcon, color: 'text-white/60' }
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function SharedFilesPanel({ messages }: Props) {
  const allFiles = messages.flatMap(m => 
    (Array.isArray(m.attachments) ? m.attachments : []).map((a: any) => ({
      ...a,
      sender: m.sender_identity,
      sent_at: m.sent_at,
    }))
  )

  if (allFiles.length === 0) return null

  return (
    <div>
      <p className="text-[9.5px] uppercase tracking-wider font-bold text-white/40 mb-2">
        Shared files ({allFiles.length})
      </p>
      <div className="space-y-1.5">
        {allFiles.slice(0, 10).map((f, i) => {
          const { icon: Icon, color } = fileMeta(f.type)
          return (
            <a
              key={i}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-colors"
            >
              <div className="w-8 h-8 rounded-md bg-white/[0.03] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                <Icon className={cn("w-3.5 h-3.5", color)} weight="fill" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11.5px] font-semibold text-white truncate">{f.name}</p>
                <p className="text-[10px] text-white/45">{fmtSize(f.size)}</p>
              </div>
              <DownloadSimple className="w-3 h-3 text-white/40 group-hover:text-white transition-colors flex-shrink-0" weight="bold" />
            </a>
          )
        })}
      </div>
    </div>
  )
}