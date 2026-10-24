'use client'

import { useState, useEffect } from 'react'
import { X, PaperPlaneTilt, Paperclip, Trash, User } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Props {
  onClose: () => void
  onSent: () => void
}

export function ComposeModal({ onClose, onSent }: Props) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [sending, setSending] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])

  useEffect(() => {
    if (to.length >= 2) {
      fetch(`/api/mail/contacts?q=${encodeURIComponent(to)}`)
        .then(r => r.json())
        .then(data => setContacts(data.contacts || []))
        .catch(() => {})
    } else {
      setContacts([])
    }
  }, [to])

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !bodyHtml.trim()) {
      toast.error('Recipient, subject, and body are required')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [to.trim()],
          subject: subject.trim(),
          body_html: bodyHtml.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send mail')

      toast.success('Message sent successfully')
      onSent()
    } catch (err: any) {
      toast.error(err.message || 'Send error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
          <h3 className="text-[14px] font-bold text-white">New Message</h3>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="p-5 space-y-3">
          <div className="relative">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">To (Username or dsrt.com Email)</label>
            <input
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="e.g. sarah or sarah@dsrt.com"
              className="w-full h-9 px-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
            />
            {contacts.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-20 divide-y divide-zinc-800/50">
                {contacts.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setTo(c.email); setContacts([]) }}
                    className="w-full p-2.5 flex items-center gap-3 hover:bg-zinc-800/60 text-left transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
                      {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-3.5 h-3.5 text-zinc-400 m-1.5" />}
                    </div>
                    <div>
                      <p className="text-[12.5px] font-bold text-white">{c.name}</p>
                      <p className="text-[10.5px] text-blue-400">{c.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Subject</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Subject line..."
              className="w-full h-9 px-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Message</label>
            <textarea
              value={bodyHtml}
              onChange={e => setBodyHtml(e.target.value)}
              placeholder="Write your email content..."
              className="w-full min-h-[180px] p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 resize-y"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500">Only routable within DSRT workspace</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 h-8 rounded-lg border border-zinc-700 text-zinc-300 text-[12px] font-semibold hover:bg-zinc-800">
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="px-5 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[12px] shadow-lg shadow-blue-500/20"
            >
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}