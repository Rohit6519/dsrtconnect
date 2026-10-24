'use client'

import { useState, useRef } from 'react'
import { PaperPlaneRight, Paperclip, X, File as FileIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Props {
  messageId: string
  onClose: () => void
  onSent: () => void
}

interface Attachment {
  url: string
  name: string
  size: number
  type: string
}

export function ReplyComposer({ messageId, onClose, onSent }: Props) {
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canSend = body.trim().length >= 1 && !sending

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (attachments.length + files.length > 5) {
      toast.error('Maximum 5 attachments')
      return
    }
    setUploading(true)
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/inbox/upload', { method: 'POST', body: fd })
        const json = await res.json()
        if (!res.ok) {
          toast.error(json.error || 'Upload failed')
          continue
        }
        setAttachments(prev => [...prev, json])
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  const send = async () => {
    if (!canSend) return
    setSending(true)
    try {
      const res = await fetch('/api/inbox/' + messageId + '/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: body.trim(),
          attachments,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to send')
      toast.success('Reply sent')
      onSent()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="mx-5 mb-5 rounded-xl border border-white/[0.1] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
        <p className="text-[12px] font-semibold text-white/70">Reply</p>
        <button
          onClick={onClose}
          disabled={sending}
          className="text-white/50 hover:text-white p-1 disabled:opacity-50"
        >
          <X size={14} />
        </button>
      </div>

      <textarea
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 10000))}
        placeholder="Write your reply..."
        className="w-full min-h-[140px] p-4 bg-transparent text-[13.5px] text-white placeholder:text-white/30 outline-none resize-y leading-relaxed"
      />

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="px-4 pb-3 border-t border-white/[0.06] pt-3">
          <p className="text-[10px] text-white/45 uppercase tracking-wider font-semibold mb-2">
            {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-1.5">
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-white/[0.03] border border-white/[0.06]">
                <FileIcon size={12} className="text-white/50 flex-shrink-0" />
                <span className="text-[11.5px] text-white/85 truncate flex-1">{att.name}</span>
                <span className="text-[10px] text-white/45">{fmtSize(att.size)}</span>
                <button
                  onClick={() => removeAttachment(i)}
                  className="text-white/40 hover:text-red-400 flex-shrink-0"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || attachments.length >= 5}
            className="w-8 h-8 rounded-md hover:bg-white/[0.06] text-white/60 hover:text-white flex items-center justify-center disabled:opacity-40"
            title="Attach files"
          >
            <Paperclip size={13} />
          </button>
          {uploading && <span className="text-[10.5px] text-white/50">Uploading...</span>}
          <span className="text-[10px] text-white/30 ml-1">{body.length} / 10000</span>
        </div>
        <button
          onClick={send}
          disabled={!canSend}
          className="inline-flex items-center gap-1.5 px-4 h-8 text-[12.5px] font-bold bg-white text-black hover:bg-zinc-200 rounded-md disabled:opacity-40"
        >
          {sending ? (
            <><div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" /> Sending</>
          ) : (
            <><PaperPlaneRight size={11} weight="fill" /> Send</>
          )}
        </button>
      </div>
    </div>
  )
}