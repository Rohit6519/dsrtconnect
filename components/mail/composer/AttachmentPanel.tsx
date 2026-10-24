'use client'

import { useRef } from 'react'
import { X, FilePdf, File as FileIcon, Image as ImageIcon, VideoCamera, FileText, Spinner } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Attachment {
  url: string
  name: string
  size: number
  type: string
  path?: string
  uploading?: boolean
}

interface Props {
  attachments: Attachment[]
  onChange: (attachments: Attachment[]) => void
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return { icon: ImageIcon, color: 'text-emerald-400' }
  if (type.startsWith('video/')) return { icon: VideoCamera, color: 'text-amber-400' }
  if (type === 'application/pdf') return { icon: FilePdf, color: 'text-red-400' }
  if (type.includes('word') || type.includes('document')) return { icon: FileText, color: 'text-blue-400' }
  return { icon: FileIcon, color: 'text-white/60' }
}

export function AttachmentPanel({ attachments, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (attachments.length + files.length > 10) {
      toast.error('Maximum 10 attachments')
      return
    }

    const filesArr = Array.from(files)
    // Add placeholder entries showing uploading state
    const placeholders: Attachment[] = filesArr.map(f => ({
      url: '',
      name: f.name,
      size: f.size,
      type: f.type,
      uploading: true,
    }))
    let newList = [...attachments, ...placeholders]
    onChange(newList)

    // Upload one by one
    for (let i = 0; i < filesArr.length; i++) {
      const file = filesArr[i]
      const fd = new FormData()
      fd.append('file', file)

      try {
        const res = await fetch('/api/mail/attachments/upload', {
          method: 'POST',
          body: fd,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Upload failed')

        // Replace placeholder with real attachment
        newList = newList.map(a => 
          (a.uploading && a.name === file.name && a.size === file.size)
            ? { url: data.url, name: data.name, size: data.size, type: data.type, path: data.path }
            : a
        )
        onChange(newList)
      } catch (e: any) {
        toast.error(`${file.name}: ${e.message}`)
        newList = newList.filter(a => !(a.uploading && a.name === file.name))
        onChange(newList)
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (idx: number) => {
    onChange(attachments.filter((_, i) => i !== idx))
  }

  if (attachments.length === 0) {
    return (
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    )
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="border-t border-white/[0.06] px-4 py-3 bg-white/[0.01]">
        <p className="text-[9.5px] uppercase tracking-wider font-bold text-white/40 mb-2">
          {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {attachments.map((att, i) => {
            const { icon: Icon, color } = fileIcon(att.type)
            return (
              <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] group">
                <div className="w-8 h-8 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                  {att.uploading ? (
                    <Spinner className="w-3.5 h-3.5 text-white/50 animate-spin" />
                  ) : (
                    <Icon className={cn("w-3.5 h-3.5", color)} weight="fill" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-white truncate">{att.name}</p>
                  <p className="text-[10.5px] text-white/45">
                    {att.uploading ? 'Uploading...' : fmtSize(att.size)}
                  </p>
                </div>
                {!att.uploading && (
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="w-6 h-6 rounded hover:bg-white/[0.08] text-white/40 hover:text-red-400 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" weight="bold" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// Expose file input trigger for parent to call
export function useAttachmentTrigger() {
  const ref = useRef<HTMLInputElement>(null)
  return { ref, trigger: () => ref.current?.click() }
}