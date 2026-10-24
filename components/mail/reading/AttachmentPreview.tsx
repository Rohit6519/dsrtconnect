'use client'

import { 
  FilePdf, File as FileIcon, Image as ImageIcon, VideoCamera, 
  FileText, DownloadSimple, ArrowSquareOut 
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface Attachment {
  url: string
  name: string
  size: number
  type: string
}

interface Props {
  attachments: Attachment[]
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function fileMeta(type: string) {
  if (type.startsWith('image/')) return { 
    icon: ImageIcon, color: 'text-emerald-400', 
    bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' 
  }
  if (type.startsWith('video/')) return { 
    icon: VideoCamera, color: 'text-amber-400', 
    bg: 'bg-amber-500/10', border: 'border-amber-500/20' 
  }
  if (type === 'application/pdf') return { 
    icon: FilePdf, color: 'text-red-400', 
    bg: 'bg-red-500/10', border: 'border-red-500/20' 
  }
  if (type.includes('word') || type.includes('document')) return { 
    icon: FileText, color: 'text-blue-400', 
    bg: 'bg-blue-500/10', border: 'border-blue-500/20' 
  }
  return { 
    icon: FileIcon, color: 'text-white/60', 
    bg: 'bg-white/[0.04]', border: 'border-white/[0.06]' 
  }
}

export function AttachmentPreview({ attachments }: Props) {
  if (!attachments || attachments.length === 0) return null

  const media = attachments.filter(a => a.type.startsWith('image/') || a.type.startsWith('video/'))
  const docs = attachments.filter(a => !a.type.startsWith('image/') && !a.type.startsWith('video/'))

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.06]">
      <p className="text-[9.5px] uppercase tracking-wider font-bold text-white/40 mb-3">
        {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
      </p>

      {/* Media grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          {media.map((a, i) => (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-video rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.15] transition-colors"
            >
              {a.type.startsWith('image/') ? (
                <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/10 to-orange-500/10">
                  <VideoCamera className="w-8 h-8 text-amber-400" weight="fill" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2.5 pt-8">
                <p className="text-[11px] font-semibold text-white truncate">{a.name}</p>
                <p className="text-[9.5px] text-white/60">{fmtSize(a.size)}</p>
              </div>
              <div className="absolute top-2 right-2 w-7 h-7 rounded-md bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ArrowSquareOut className="w-3.5 h-3.5" weight="bold" />
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Documents */}
      {docs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {docs.map((a, i) => {
            const { icon: Icon, color, bg, border } = fileMeta(a.type)
            return (
              <a
                key={i}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.04] transition-colors"
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border",
                  bg, border
                )}>
                  <Icon className={cn("w-4 h-4", color)} weight="fill" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold text-white truncate">{a.name}</p>
                  <p className="text-[10.5px] text-white/50">{fmtSize(a.size)}</p>
                </div>
                <DownloadSimple className="w-3.5 h-3.5 text-white/40 group-hover:text-white transition-colors flex-shrink-0" weight="bold" />
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}