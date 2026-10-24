'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RichEditorLite } from '../shared/RichEditorLite'
import { cn } from '@/lib/utils'
import {
  X, PaperPlaneTilt, Paperclip, FileIcon, Image as ImageIcon,
  VideoCamera, FilePdf, Spinner, Trash
} from '@phosphor-icons/react'

interface ConnectLightboxProps {
  recipientId: string
  recipientName: string
  onClose: () => void
}

export function ConnectLightbox({ recipientId, recipientName, onClose }: ConnectLightboxProps) {
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [attachments, setAttachments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    
    if (attachments.length + files.length > 10) {
      toast.error('Max 10 attachments')
      return
    }

    setUploading(true)
    const newAtts: any[] = []

    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await fetch('/api/profile/connect/upload', { method: 'POST', body: fd })
        if (!res.ok) throw new Error()
        const data = await res.json()
        newAtts.push(data)
      } catch {
        toast.error(`Failed to upload ${file.name}`)
      }
    }

    setAttachments(cur => [...cur, ...newAtts])
    setUploading(false)
    e.target.value = ''
  }

  const handleSend = async () => {
    const stripped = html.replace(/<[^>]*>/g, '').trim()
    if (!stripped && attachments.length === 0) {
      toast.error('Message cannot be empty')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/profile/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId,
          subject,
          message_html: html,
          attachments,
        }),
      })

      if (!res.ok) throw new Error('Failed to send message')
      
      toast.success('Connection request sent')
      onClose()
    } catch {
      toast.error('Failed to send request')
      setSending(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !sending && !uploading) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 10 }}
        className="bg-zinc-950 border border-zinc-800/60 rounded-2xl w-full max-w-2xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_64px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-zinc-800/60 flex items-center justify-between bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <PaperPlaneTilt className="w-5 h-5 text-blue-400" weight="fill" />
            <h2 className="text-[15px] font-bold text-white tracking-tight">Connect with {recipientName}</h2>
          </div>
          <button onClick={onClose} disabled={sending || uploading} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" weight="bold" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Subject (Optional)</label>
            <Input 
              value={subject} onChange={e => setSubject(e.target.value)} 
              placeholder="What is this regarding?"
              className="bg-zinc-900/60 border-zinc-800 text-zinc-200 h-10"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Message</label>
            <RichEditorLite
              value={html} onChange={setHtml}
              placeholder={`Write a message to ${recipientName}...`}
              minHeight="200px"
              toolbar="full"
              className="bg-zinc-900/40 border-zinc-800"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Attachments</label>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} />
            
            {attachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800 group">
                    <div className="w-8 h-8 flex-shrink-0 bg-zinc-950 rounded flex items-center justify-center">
                      {att.media_type === 'image' && <ImageIcon className="w-4 h-4 text-purple-400" />}
                      {att.media_type === 'video' && <VideoCamera className="w-4 h-4 text-orange-400" />}
                      {att.media_type === 'pdf' && <FilePdf className="w-4 h-4 text-red-400" />}
                      {att.media_type === 'attachment' && <FileIcon className="w-4 h-4 text-blue-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-zinc-300 truncate">{att.filename}</p>
                      <p className="text-[9px] text-zinc-600">{(att.file_size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    <button onClick={() => setAttachments(cur => cur.filter((_, idx) => idx !== i))} className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                      <Trash className="w-3 h-3" weight="bold" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-xl hover:border-zinc-700 hover:bg-zinc-900/40 transition-colors flex items-center justify-center gap-2 text-[12px] text-zinc-400 font-semibold"
            >
              {uploading ? <Spinner className="w-4 h-4 animate-spin" weight="bold" /> : <Paperclip className="w-4 h-4" weight="bold" />}
              {uploading ? 'Uploading...' : 'Attach files, images, or videos'}
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800/60 flex items-center justify-between bg-zinc-900/30">
          <p className="text-[11px] text-zinc-500">Inbox V2 system active</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={sending || uploading} className="border-zinc-700 text-zinc-400 hover:text-white bg-transparent h-9">
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending || uploading} className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-9 px-6 shadow-lg shadow-blue-500/20 border border-blue-400/50">
              {sending ? 'Sending...' : <><PaperPlaneTilt className="w-4 h-4 mr-1.5" weight="fill" /> Send</>}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}