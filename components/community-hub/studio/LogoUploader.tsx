'use client'

import { useRef, useState } from 'react'
import { Loader2, ImagePlus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import { useSignedUpload } from '@/hooks/useSignedUpload'

interface Props {
  value: string | null
  onChange: (url: string | null, fileId: string | null) => void
  aspect?: 'square' | 'wide'
  label?: string
  hint?: string
  entityId?: string
}

export function LogoUploader({
  value,
  onChange,
  aspect = 'square',
  label = 'Logo',
  hint,
  entityId,
}: Props) {
  const { upload, uploading } = useSignedUpload()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handle = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error('File must be under 8MB')
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image')
      return
    }
    const result = await upload(file, {
      entity_type: 'community_draft',
      entity_id: entityId,
      visibility: 'PUBLIC',
    })
    if (result) {
      onChange(result.public_url, result.file_id)
      toast.success(`${label} uploaded`)
    } else {
      toast.error('Upload failed')
    }
  }

  const clear = () => onChange(null, null)

  return (
    <div className="space-y-2">
      <p className="text-[11.5px] font-mono uppercase tracking-wider text-white/60">{label}</p>
      <div
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const f = e.dataTransfer.files?.[0]
          if (f) handle(f)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          'relative overflow-hidden rounded-xl border cursor-pointer transition-colors',
          aspect === 'square' ? 'aspect-square w-32' : 'aspect-[16/6] w-full',
          value
            ? 'border-white/[0.14] bg-white/[0.04]'
            : dragOver
            ? 'border-white/[0.22] bg-white/[0.05]'
            : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]'
        )}
      >
        {value ? (
          <>
            <img src={value} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  clear()
                }}
                className="w-8 h-8 rounded-full bg-black/70 border border-white/20 text-white hover:bg-black flex items-center justify-center"
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-white/50">
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImagePlus className="w-4 h-4" strokeWidth={1.75} />
            )}
            <p className="text-[11px] font-mono uppercase tracking-wider">
              {uploading ? 'Uploading' : aspect === 'square' ? 'Add logo' : 'Add cover'}
            </p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handle(f)
          if (inputRef.current) inputRef.current.value = ''
        }}
      />
      {hint && <p className="text-[11px] text-white/40 leading-relaxed">{hint}</p>}
    </div>
  )
}