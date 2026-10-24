'use client'

import { File as FileIcon, DownloadSimple, Image as ImageIcon, VideoCamera } from '@phosphor-icons/react'

interface Attachment {
  id: string
  file_name: string
  file_url: string
  file_size: number
  mime_type: string
}

interface Props {
  attachments: Attachment[]
}

function formatBytes(n: number): string {
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / 1024 / 1024).toFixed(1) + ' MB'
}

function getIcon(mime: string) {
  if (mime?.startsWith('image/')) return ImageIcon
  if (mime?.startsWith('video/')) return VideoCamera
  return FileIcon
}

export function MessageAttachments({ attachments }: Props) {
  if (!attachments || attachments.length === 0) return null

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Attachments</p>
      {attachments.map(att => {
        const Icon = getIcon(att.mime_type)
        const isImage = att.mime_type?.startsWith('image/')

        return (
          <div key={att.id}>
            {isImage && (
              <a href={att.file_url} target="_blank" rel="noopener noreferrer"
                className="block rounded-lg overflow-hidden border border-white/[0.08] mb-1.5 max-w-sm">
                <img src={att.file_url} alt={att.file_name} className="w-full h-auto max-h-[200px] object-cover" />
              </a>
            )}
            <a
              href={att.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 p-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-colors max-w-sm group"
            >
              <div className="w-9 h-9 rounded-md bg-white/[0.04] flex items-center justify-center text-white/50 shrink-0">
                <Icon size={16} weight="regular" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-white/80 truncate group-hover:text-white">{att.file_name}</p>
                <p className="text-[10px] text-white/40">{formatBytes(att.file_size)}</p>
              </div>
              <DownloadSimple size={13} className="text-white/40 group-hover:text-white shrink-0" />
            </a>
          </div>
        )
      })}
    </div>
  )
}
