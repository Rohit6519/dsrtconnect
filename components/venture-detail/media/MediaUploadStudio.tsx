'use client'

import { useState, useRef, useCallback } from 'react'
import {
  X, UploadSimple, CircleNotch, CheckCircle, Trash, Warning,
  Image as ImageIcon, VideoCamera, FileText, ArrowClockwise
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  slug: string
  onSuccess: () => void
}

type TaskStatus = 'pending' | 'uploading' | 'committing' | 'done' | 'error' | 'cancelled'

interface UploadTask {
  id: string
  file: File
  progress: number
  status: TaskStatus
  error?: string
  publicUrl?: string
  storagePath?: string
  mediaType?: string
  abortController?: AbortController
}

const MAX_CONCURRENT = 3

export function MediaUploadStudio({ open, onClose, slug, onSuccess }: Props) {
  const [tasks, setTasks] = useState<UploadTask[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = (files: FileList | File[]) => {
    const newTasks: UploadTask[] = Array.from(files).map(file => ({
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      file,
      progress: 0,
      status: 'pending' as TaskStatus,
    }))
    setTasks(prev => [...prev, ...newTasks])
  }

  const removeTask = (id: string) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === id)
      if (task?.abortController) task.abortController.abort()
      return prev.filter(t => t.id !== id)
    })
  }

  const retryTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'pending' as TaskStatus, progress: 0, error: undefined } : t))
    // Uploads will resume when startUploads() runs
  }

  const updateTask = (id: string, patch: Partial<UploadTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  /**
   * Extracts image dimensions before upload
   */
  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ width: img.width, height: img.height })
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
      }
      img.src = url
    })
  }

  /**
   * Extracts video dimensions and duration before upload
   */
  const getVideoMeta = (file: File): Promise<{ width: number; height: number; duration: number }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      const url = URL.createObjectURL(file)
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration
        })
      }
      video.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load video'))
      }
      video.src = url
    })
  }

  /**
   * Uploads a single file end-to-end.
   */
  const uploadFile = async (task: UploadTask) => {
    const abortController = new AbortController()
    updateTask(task.id, { status: 'uploading', progress: 5, abortController })

    try {
      // Step 1: Get signed URL
      const signRes = await fetch(`/api/ventures/${slug}/media/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: task.file.name,
          mime_type: task.file.type,
          file_size: task.file.size,
        }),
        signal: abortController.signal,
      })
      const signJson = await signRes.json()
      if (!signRes.ok) throw new Error(signJson.error || 'Failed to get upload URL')

      updateTask(task.id, { progress: 20, mediaType: signJson.media_type })

      // Step 2: Upload directly to storage
      const uploadRes = await fetch(signJson.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': task.file.type },
        body: task.file,
        signal: abortController.signal,
      })
      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`)

      updateTask(task.id, {
        progress: 70,
        publicUrl: signJson.public_url,
        storagePath: signJson.storage_path,
        status: 'committing'
      })

      // Step 3: Extract metadata & commit to database
      let width: number | undefined
      let height: number | undefined
      let duration: number | undefined

      try {
        if (signJson.media_type === 'image') {
          const dims = await getImageDimensions(task.file)
          width = dims.width; height = dims.height
        } else if (signJson.media_type === 'video') {
          const meta = await getVideoMeta(task.file)
          width = meta.width; height = meta.height; duration = meta.duration
        }
      } catch {
        // Metadata extraction failed — proceed without dimensions
      }

      const commitRes = await fetch(`/api/ventures/${slug}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_url: signJson.public_url,
          storage_path: signJson.storage_path,
          mime_type: task.file.type,
          file_size: task.file.size,
          media_type: signJson.media_type,
          title: task.file.name.split('.').slice(0, -1).join('.') || task.file.name,
          width, height, duration_seconds: duration,
          visibility: 'public',
        }),
        signal: abortController.signal,
      })
      const commitJson = await commitRes.json()
      if (!commitRes.ok) throw new Error(commitJson.error || 'Failed to commit')

      updateTask(task.id, { status: 'done', progress: 100, abortController: undefined })
      return true
    } catch (e: any) {
      if (e.name === 'AbortError') {
        updateTask(task.id, { status: 'cancelled', abortController: undefined })
      } else {
        updateTask(task.id, {
          status: 'error',
          error: e.message || 'Upload failed',
          abortController: undefined
        })
      }
      return false
    }
  }

  const startUploads = async () => {
    const pending = tasks.filter(t => t.status === 'pending')
    if (pending.length === 0) return

    setIsUploading(true)

    // Concurrent uploads with max limit
    const queue = [...pending]
    const inFlight: Promise<any>[] = []

    while (queue.length > 0 || inFlight.length > 0) {
      while (inFlight.length < MAX_CONCURRENT && queue.length > 0) {
        const task = queue.shift()!
        const promise = uploadFile(task).then(() => {
          const idx = inFlight.indexOf(promise)
          if (idx >= 0) inFlight.splice(idx, 1)
        })
        inFlight.push(promise)
      }
      if (inFlight.length > 0) {
        await Promise.race(inFlight)
      }
    }

    setIsUploading(false)
    const successCount = tasks.filter(t => t.status === 'done').length
    if (successCount > 0) {
      toast.success(`${successCount} file${successCount === 1 ? '' : 's'} uploaded`)
      onSuccess()
    }
  }

  const handleClose = () => {
    // Abort all in-flight uploads
    tasks.forEach(t => t.abortController?.abort())
    setTasks([])
    setIsUploading(false)
    onClose()
  }

  const handleClearDone = () => {
    setTasks(prev => prev.filter(t => t.status !== 'done'))
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setDragging(false)
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }, [])

  if (!open) return null

  const pendingCount = tasks.filter(t => t.status === 'pending').length
  const doneCount = tasks.filter(t => t.status === 'done').length
  const errorCount = tasks.filter(t => t.status === 'error').length

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={handleClose}>
      <div
        className="bg-[#0d0d10] border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-[16px] font-bold text-white">Upload Media</h2>
            <p className="text-[11.5px] text-zinc-500 mt-0.5">
              Images, videos, and documents · Multi-file supported
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={e => e.target.files && addFiles(e.target.files)}
          />

          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={
              'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ' +
              (dragging
                ? 'border-white bg-white/[0.03] scale-[1.01]'
                : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/40 hover:bg-zinc-900/60')
            }
          >
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-3">
              <UploadSimple size={20} className="text-zinc-400" />
            </div>
            <p className="text-[13.5px] font-bold text-white mb-1">
              Drop files here or click to browse
            </p>
            <p className="text-[11.5px] text-zinc-500">
              JPG, PNG, WEBP, MP4, WEBM, PDF · Max 20MB images, 500MB videos
            </p>
          </div>

          {/* File queue */}
          {tasks.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-semibold">
                  Queue ({tasks.length}) · {doneCount} done · {pendingCount} pending{errorCount > 0 ? ` · ${errorCount} failed` : ''}
                </p>
                {doneCount > 0 && (
                  <button
                    onClick={handleClearDone}
                    className="text-[10.5px] text-zinc-500 hover:text-white transition-colors"
                  >
                    Clear completed
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {tasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onRemove={() => removeTask(task.id)}
                    onRetry={() => retryTask(task.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/30 flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 h-9 text-[12.5px] font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            {doneCount > 0 && !isUploading ? 'Done' : 'Cancel'}
          </button>
          <button
            onClick={startUploads}
            disabled={isUploading || pendingCount === 0}
            className="inline-flex items-center gap-1.5 px-5 h-9 bg-white text-black rounded-lg text-[12.5px] font-bold hover:bg-zinc-100 disabled:opacity-50"
          >
            {isUploading ? (
              <><CircleNotch size={13} className="animate-spin" /> Uploading…</>
            ) : (
              `Upload ${pendingCount} file${pendingCount === 1 ? '' : 's'}`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function TaskRow({ task, onRemove, onRetry }: {
  task: UploadTask
  onRemove: () => void
  onRetry: () => void
}) {
  const Icon = task.file.type.startsWith('image/') ? ImageIcon
    : task.file.type.startsWith('video/') ? VideoCamera
    : FileText

  return (
    <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
          <Icon size={14} className="text-zinc-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-white truncate">{task.file.name}</p>
          <p className="text-[10px] text-zinc-500">{(task.file.size / (1024 * 1024)).toFixed(2)} MB</p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          {task.status === 'uploading' || task.status === 'committing' ? (
            <>
              <span className="text-[10px] font-mono text-zinc-400 tabular-nums">{task.progress}%</span>
              <CircleNotch size={12} className="animate-spin text-blue-400" />
            </>
          ) : task.status === 'done' ? (
            <CheckCircle size={14} weight="fill" className="text-emerald-400" />
          ) : task.status === 'error' ? (
            <>
              <Warning size={13} weight="fill" className="text-red-400" />
              <button
                onClick={onRetry}
                className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
                title="Retry"
              >
                <ArrowClockwise size={12} />
              </button>
            </>
          ) : task.status === 'cancelled' ? (
            <span className="text-[10px] text-zinc-500">Cancelled</span>
          ) : null}

          {(task.status === 'pending' || task.status === 'error' || task.status === 'cancelled') && (
            <button
              onClick={onRemove}
              className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
            >
              <Trash size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(task.status === 'uploading' || task.status === 'committing') && (
        <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      )}

      {/* Error message */}
      {task.status === 'error' && task.error && (
        <p className="mt-1.5 text-[10.5px] text-red-400">{task.error}</p>
      )}
    </div>
  )
}