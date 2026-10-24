'use client'

import { useState, useEffect } from 'react'
import { X, LinkSimple, Check, TwitterLogo, LinkedinLogo, EnvelopeSimple, Code } from '@phosphor-icons/react'

interface Props {
  post: any
  onClose: () => void
}

export function ShareModal({ post, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/posts/${post.id}`
    : ''

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const trackShare = async (method: string, destination?: string) => {
    try {
      await fetch(`/api/posts/${post.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, destination }),
      })
    } catch {}
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      trackShare('copy_link')
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  const shareOn = (platform: 'twitter' | 'linkedin' | 'email') => {
    const text = encodeURIComponent(post.content?.slice(0, 200) || post.title || 'Check this DSRT post')
    const enc = encodeURIComponent(url)
    let href = ''
    if (platform === 'twitter')  href = `https://twitter.com/intent/tweet?text=${text}&url=${enc}`
    if (platform === 'linkedin') href = `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`
    if (platform === 'email')    href = `mailto:?subject=DSRT&body=${text} ${enc}`
    if (href) {
      window.open(href, '_blank', 'noopener,noreferrer')
      trackShare('external', platform)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0a0a0b] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-[15px] font-bold text-white tracking-tight">Share this post</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-900 flex items-center justify-center"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* URL copy */}
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-[0.08em] text-zinc-500 mb-2">
              Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                readOnly
                className="flex-1 h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-300 focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className={
                  'inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-[12.5px] font-bold transition-colors ' +
                  (copied
                    ? 'bg-emerald-500 text-black'
                    : 'bg-white text-black hover:bg-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]')
                }
              >
                {copied ? <><Check size={12} weight="bold" />Copied</> : <><LinkSimple size={12} weight="bold" />Copy</>}
              </button>
            </div>
          </div>

          {/* Social */}
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-[0.08em] text-zinc-500 mb-2">
              Share to
            </label>
            <div className="grid grid-cols-3 gap-2">
              <ShareBtn Icon={TwitterLogo} label="X / Twitter" onClick={() => shareOn('twitter')} />
              <ShareBtn Icon={LinkedinLogo} label="LinkedIn" onClick={() => shareOn('linkedin')} />
              <ShareBtn Icon={EnvelopeSimple} label="Email" onClick={() => shareOn('email')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ShareBtn({ Icon, label, onClick }: { Icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        'flex flex-col items-center gap-1.5 py-3 rounded-lg border border-zinc-800 ' +
        'hover:border-zinc-700 hover:bg-zinc-900 ' +
        'text-zinc-300 hover:text-white transition-colors'
      }
    >
      <Icon size={18} weight="regular" />
      <span className="text-[11px] font-medium tracking-tight">{label}</span>
    </button>
  )
}