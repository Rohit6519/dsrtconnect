'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MagnifyingGlass, PencilSimple, Envelope, Archive, Star, Trash } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelectAction: (action: string) => void
}

const COMMANDS = [
  { id: 'compose', icon: PencilSimple, label: 'Compose new message', shortcut: 'C' },
  { id: 'inbox', icon: Envelope, label: 'Go to Inbox', shortcut: 'G I' },
  { id: 'starred', icon: Star, label: 'Go to Starred', shortcut: 'G S' },
  { id: 'sent', icon: Envelope, label: 'Go to Sent Mail', shortcut: 'G T' },
  { id: 'archive', icon: Archive, label: 'Archive active thread', shortcut: 'E' },
  { id: 'trash', icon: Trash, label: 'Trash active thread', shortcut: '#' },
]

export function MailCommandPalette({ isOpen, onClose, onSelectAction }: Props) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  if (!isOpen) return null

  const filtered = COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-[540px] bg-gradient-to-b from-[#141419] to-[#0a0a0f] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center gap-3 px-4 h-14 border-b border-white/[0.08]">
            <MagnifyingGlass className="w-5 h-5 text-white/50" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search actions or commands..."
              className="flex-1 bg-transparent text-[15px] text-white placeholder:text-white/40 focus:outline-none"
            />
            <span className="text-[10px] font-bold text-white/30 bg-white/[0.05] px-2 py-1 rounded">ESC</span>
          </div>
          <div className="p-2 max-h-[300px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-[12px] text-white/40 text-center py-6">No commands found.</p>
            ) : (
              filtered.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => { onSelectAction(cmd.id); onClose() }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                    "hover:bg-white/[0.06] focus:bg-white/[0.06] outline-none"
                  )}
                >
                  <cmd.icon className="w-4 h-4 text-white/60" />
                  <span className="flex-1 text-[13px] font-medium text-white/90">{cmd.label}</span>
                  <span className="text-[10px] font-mono font-bold text-white/30 tracking-widest">{cmd.shortcut}</span>
                </button>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}