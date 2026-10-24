'use client'

import { useState } from 'react'
import { X, Sparkle, PaperPlaneRight, Lightning, ArrowRight, Copy, Check } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  activeThreadId: string | null
}

const SUGGESTIONS = [
  { label: 'Summarize this thread', icon: '📋' },
  { label: 'Draft a professional reply', icon: '✍️' },
  { label: 'Extract action items', icon: '✓' },
  { label: 'Rewrite in a friendlier tone', icon: '💬' },
]

export function CocoSidebar({ open, onClose, activeThreadId }: Props) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const askCoco = async (actionText: string, isCustom = false) => {
    if (!activeThreadId) {
      toast.error('Please select a conversation first')
      return
    }

    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/mail/coco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: activeThreadId,
          action: isCustom ? 'custom' : actionText,
          customPrompt: isCustom ? actionText : undefined
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      setResult(data.result)
      if (isCustom) setInput('')
    } catch (err: any) {
      toast.error(err.message || 'COCO encountered an error')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!result) return
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard')
  }

  if (!open) return null

  return (
    <aside className={cn(
      "w-[380px] flex-shrink-0 flex flex-col overflow-hidden border-l border-white/[0.06]",
      "bg-gradient-to-b from-[#0c0c12] to-[#08080c]"
    )}>
      {/* Header */}
      <div className="h-11 flex items-center justify-between px-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500/25 to-blue-500/25 border border-violet-500/30 flex items-center justify-center">
            <Sparkle className="w-3.5 h-3.5 text-violet-300" weight="fill" />
          </div>
          <p className="text-[13px] font-bold text-white tracking-tight">COCO</p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-md hover:bg-white/[0.06] text-white/50 hover:text-white flex items-center justify-center"
        >
          <X className="w-3.5 h-3.5" weight="bold" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col space-y-5">
        
        {/* Banner */}
        <div className="rounded-xl overflow-hidden border border-white/[0.06]">
          <div 
            className="aspect-square w-full flex items-center justify-center relative"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(139,92,246,0.18), transparent 55%), radial-gradient(circle at 70% 75%, rgba(59,130,246,0.15), transparent 55%), linear-gradient(180deg, #12121a, #0a0a0f)'
            }}
          >
            <div className="text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center mx-auto mb-4 shadow-[0_8px_32px_rgba(139,92,246,0.4)]">
                <Sparkle className="w-7 h-7 text-white" weight="fill" />
              </div>
              <p className="text-[15px] font-bold text-white mb-2 tracking-tight">Ask COCO</p>
              <p className="text-[11.5px] text-white/60 leading-relaxed max-w-[220px] mx-auto">
                Your intelligent co-pilot. Summarize threads, draft replies, and extract insights instantly.
              </p>
            </div>
          </div>
        </div>

        {/* AI Result Area */}
        {loading ? (
          <div className="flex-1 min-h-[200px] flex flex-col items-center justify-center border border-white/[0.05] rounded-xl bg-white/[0.02]">
            <Sparkle className="w-6 h-6 text-violet-400 animate-pulse mb-3" weight="fill" />
            <p className="text-[11px] text-white/50 animate-pulse">COCO is analyzing...</p>
          </div>
        ) : result ? (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9.5px] uppercase tracking-widest font-bold text-violet-300">Result</p>
              <button 
                onClick={handleCopy}
                className="flex items-center gap-1 text-[10px] font-semibold text-white/50 hover:text-white"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[13px] text-white/85 leading-relaxed whitespace-pre-wrap flex-1 overflow-y-auto">
              {result}
            </div>
            <button 
              onClick={() => setResult(null)}
              className="mt-3 text-[11px] text-white/40 hover:text-white text-center"
            >
              Clear result
            </button>
          </div>
        ) : (
          /* Quick actions */
          <div className="flex-1">
            <p className="text-[9.5px] uppercase tracking-[0.14em] font-bold text-white/40 mb-2 px-1">
              Quick Actions
            </p>
            <div className="space-y-1.5">
              {SUGGESTIONS.map(s => (
                <button
                  key={s.label}
                  disabled={!activeThreadId}
                  onClick={() => askCoco(s.label)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1] text-left transition-colors group disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="text-[13px]">{s.icon}</span>
                  <span className="flex-1 text-[12px] font-medium text-white/80 group-hover:text-white">{s.label}</span>
                  <ArrowRight className="w-3 h-3 text-white/30 group-hover:text-white/60" weight="bold" />
                </button>
              ))}
            </div>
            {!activeThreadId && (
              <p className="text-[10px] text-white/35 mt-4 text-center">
                Select a conversation to use quick actions.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/[0.06] flex-shrink-0">
        <div className="relative">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && input.trim()) askCoco(input, true)
            }}
            placeholder="Ask COCO to do something..."
            className="w-full h-10 pl-3.5 pr-11 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[12.5px] text-white placeholder:text-white/35 focus:outline-none focus:border-white/[0.18]"
          />
          <button
            onClick={() => askCoco(input, true)}
            disabled={!input.trim() || loading || !activeThreadId}
            className="absolute right-1.5 top-1.5 w-7 h-7 rounded-lg bg-white text-black hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <PaperPlaneRight className="w-3.5 h-3.5" weight="fill" />
          </button>
        </div>
      </div>
    </aside>
  )
}