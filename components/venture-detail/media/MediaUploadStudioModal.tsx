'use client'

import { useState, useRef } from 'react'
import { X, UploadSimple, CircleNotch, CheckCircle, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  slug: string
  onSuccess: () => void
}

interface UploadTask {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

export function MediaUploadStudioModal({ open, onClose, slug, onSuccess }: Props) {
  const [tasks, setTasks] = useState<UploadTask[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const handleSelect = (files: FileList | null) => {
    if (!files) return
    const newTasks: UploadTask[] = Array.from(files).map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }))
    setTasks(prev => [...prev, ...newTasks])
  }

  const removeTask = (idx: number) => {
    setTasks(prev => prev.filter((_, i) => i !== idx))
  }

  const startUploads = async () => {
    if (tasks.length === 0) return
    setIsUploading(true)

    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].status === 'done') continue

      setTasks(prev => prev.map((t, index) => index === i ? { ...t, status: 'uploading', progress: 30 } : t))

      try {
        const formData = new FormData()
        formData.append('file', tasks[i].file)

        const res = await fetch(`/api/ventures/${slug}/media`, {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) throw new Error('Upload failed')

        setTasks(prev => prev.map((t, index) => index === i ? { ...t, status: 'done', progress: 100 } : t))
      } catch (e: any) {
        setTasks(prev => prev.map((t, index) => index === i ? { ...t, status: 'error', error: e.message } : t))
      }
    }

    setIsUploading(false)
    toast.success('Media batch processed')
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#121215] border border-white/[0.1] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/30">
          <h2 className="text-[15px] font-bold text-white">Upload Media Studio</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf"
            className="hidden"
            onChange={e => handleSelect(e.target.files)}
          />

          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-800 hover:border-zinc-600 bg-zinc-950/40 rounded-xl p-8 text-center cursor-pointer transition-colors"
          >
            <UploadSimple size={28} className="text-zinc-500 mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-white">Drag files here or click to browse</p>
            <p className="text-[11px] text-zinc-500 mt-1">Supports Images, Videos (MP4, WEBM), and PDF Pitch Decks</p>
          </div>

          {/* File Queue */}
          {tasks.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {tasks.map((task, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{task.file.name}</p>
                    <p className="text-[10px] text-zinc-500">{(task.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                  {task.status === 'uploading' && <CircleNotch size={14} className="animate-spin text-blue-400" />}
                  {task.status === 'done' && <CheckCircle size={14} weight="fill" className="text-emerald-400" />}
                  {task.status === 'error' && <span className="text-red-400">Failed</span>}
                  {!isUploading && (
                    <button onClick={() => removeTask(idx)} className="text-zinc-500 hover:text-red-400">
                      <Trash size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex justify-end gap-2">
          <button onClick={onClose} disabled={isUploading} className="px-4 h-9 text-[12.5px] font-semibold text-zinc-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={startUploads}
            disabled={isUploading || tasks.length === 0}
            className="inline-flex items-center gap-1.5 px-5 h-9 bg-white text-black rounded-lg text-[12.5px] font-bold hover:bg-zinc-200 disabled:opacity-50"
          >
            {isUploading ? <CircleNotch size={14} className="animate-spin" /> : 'Start Upload'}
          </button>
        </div>

      </div>
    </div>
  )
}