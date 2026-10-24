'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  X, PaperPlaneTilt, Paperclip, FileIcon, Image as ImageIcon,
  VideoCamera, FilePdf, Spinner, Trash, UserPlus, Briefcase, Buildings
} from '@phosphor-icons/react'
import { RichEditorLite } from '@/components/profile-v3/shared/RichEditorLite'
import { cn } from '@/lib/utils'

export type ComposerContext = 
  | { type: 'connect_user'; recipientId: string; recipientName: string }
  | { type: 'connect_venture'; ventureId: string; ventureName: string; ventureOwnerId: string }
  | { type: 'apply_opportunity'; opportunityId: string; opportunityTitle: string; ownerId: string }

interface Props {
  context: ComposerContext
  onClose: () => void
  onSent?: () => void
}

export function AdvancedComposerLightbox({ context, onClose, onSent }: Props) {
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [attachments, setAttachments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-fill subject based on context
  useEffect(() => {
    if (context.type === 'connect_user') setSubject(`Connection Request`)
    if (context.type === 'connect_venture') setSubject(`Connecting regarding ${context.ventureName}`)
    if (context.type === 'apply_opportunity') setSubject(`Application for ${context.opportunityTitle}`)
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [context])

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (attachments.length + files.length > 5) {
      toast.error('Maximum 5 attachments allowed')
      return
    }

    setUploading(true)
    const newAtts: any[] = []

    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await fetch('/api/mail/attachments/upload', { method: 'POST', body: fd })
        if (!res.ok) throw new Error()
        newAtts.push(await res.json())
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
      let payload: any = {
        subject: subject.trim() || 'No Subject',
        body_html: html,
        attachments,
      }

      // Map context to Mail V2 fields
      if (context.type === 'connect_user') {
        payload = { ...payload, to: [context.recipientId], source_type: 'connect', source_entity_type: 'user', source_entity_id: context.recipientId }
      } else if (context.type === 'connect_venture') {
        payload = { ...payload, to: [context.ventureOwnerId], source_type: 'venture_invite', source_entity_type: 'venture', source_entity_id: context.ventureId }
      } else if (context.type === 'apply_opportunity') {
        payload = { ...payload, to: [context.ownerId], source_type: 'application', source_entity_type: 'opportunity', source_entity_id: context.opportunityId }
      }

      const res = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to send')
      }
      
      toast.success('Message sent successfully')
      if (onSent) onSent()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to send request')
      setSending(false)
    }
  }

  // UI mapping
  const headerConfig = {
    connect_user: { icon: UserPlus, title: `Connect with ${context.type === 'connect_user' ? context.recipientName : ''}`, color: 'text-blue-400' },
    connect_venture: { icon: Buildings, title: `Connect with ${context.type === 'connect_venture' ? context.ventureName : ''}`, color: 'text-purple-400' },
    apply_opportunity: { icon: Briefcase, title: `Apply for ${context.type === 'apply_opportunity' ? context.opportunityTitle : ''}`, color: 'text-emerald-400' },
  }[context.type]

  const HeaderIcon = headerConfig.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget && !sending && !uploading) onClose() }}
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0, y: 15 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0, y: 15 }}
          className="bg-[#0a0a0b] border border-zinc-800/80 rounded-2xl w-full max-w-[650px] shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset,0_24px_64px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/40">
            <div className="flex items-center gap-2.5">
              <HeaderIcon className={cn("w-5 h-5", headerConfig.color)} weight="fill" />
              <h2 className="text-[15px] font-bold text-white tracking-tight">{headerConfig.title}</h2>
            </div>
            <button onClick={onClose} disabled={sending || uploading} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
              <X className="w-4 h-4" weight="bold" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Subject</label>
              <input 
                value={subject} onChange={e => setSubject(e.target.value)} 
                className="w-full h-10 px-3 bg-zinc-900/60 border border-zinc-800 rounded-lg text-[14px] text-zinc-200 focus:outline-none focus:border-zinc-700 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Message</label>
              <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/40 focus-within:border-zinc-700 transition-colors">
                <RichEditorLite
                  value={html} onChange={setHtml}
                  placeholder="Introduce yourself, drop a link, or explain why you're reaching out..."
                  minHeight="180px"
                  toolbar="full"
                  className="border-none bg-transparent"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                <span>Attachments</span>
                <span className="text-zinc-600 font-medium normal-case">{attachments.length}/5 files</span>
              </label>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} />
              
              {attachments.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 group">
                      <div className="w-8 h-8 flex-shrink-0 bg-zinc-950 border border-zinc-800/80 rounded flex items-center justify-center">
                        {att.type.includes('image') ? <ImageIcon className="w-4 h-4 text-purple-400" /> :
                         att.type.includes('video') ? <VideoCamera className="w-4 h-4 text-orange-400" /> :
                         att.type.includes('pdf') ? <FilePdf className="w-4 h-4 text-red-400" /> :
                         <FileIcon className="w-4 h-4 text-blue-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-zinc-300 truncate">{att.name}</p>
                        <p className="text-[10px] text-zinc-500">{(att.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      <button onClick={() => setAttachments(cur => cur.filter((_, idx) => idx !== i))} className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                        <Trash className="w-3.5 h-3.5" weight="bold" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {attachments.length < 5 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-xl hover:border-zinc-700 hover:bg-zinc-900/60 transition-colors flex items-center justify-center gap-2 text-[13px] text-zinc-400 font-semibold"
                >
                  {uploading ? <Spinner className="w-4 h-4 animate-spin" weight="bold" /> : <Paperclip className="w-4 h-4" weight="bold" />}
                  {uploading ? 'Uploading securely...' : 'Attach Pitch Decks, Resumes, or Demos'}
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-zinc-800/80 flex items-center justify-between bg-zinc-950/60">
            <div className="flex items-center gap-2 text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[11px] font-medium tracking-wide uppercase">Secured via DSRT Mail</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onClose} disabled={sending || uploading} className="px-5 h-9 rounded-lg text-zinc-400 hover:text-white font-semibold text-[13px] transition-colors">
                Cancel
              </button>
              <button 
                onClick={handleSend} 
                disabled={sending || uploading} 
                className="flex items-center gap-2 h-9 px-6 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[13px] shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
              >
                {sending ? 'Sending...' : <><PaperPlaneTilt className="w-4 h-4" weight="fill" /> Send Message</>}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}