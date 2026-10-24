'use client'

import { useEffect, useState } from 'react'
import { X, LinkSimple, Check, TwitterLogo, LinkedinLogo, EnvelopeSimple } from '@phosphor-icons/react'

interface Props {
  opportunity: any
  onClose: () => void
}

export function ShareModal({ opportunity, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined'
    ? window.location.origin + '/looking-for/' + opportunity.slug
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { }
  }

  const shareOn = (platform: 'twitter' | 'linkedin' | 'email') => {
    const text = encodeURIComponent(opportunity.title)
    const encodedUrl = encodeURIComponent(url)
    let href = ''
    if (platform === 'twitter') href = `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`
    else if (platform === 'linkedin') href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
    else if (platform === 'email') href = `mailto:?subject=${text}&body=${encodedUrl}`
    if (href) window.open(href, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-[15px] font-bold text-white">Share opportunity</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-900"
          >
            <X size={13} weight="bold" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* URL copy */}
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
              Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                readOnly
                className="flex-1 h-10 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-300 focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-white text-black hover:bg-zinc-200 text-[12.5px] font-semibold transition-colors"
              >
                {copied ? <><Check size={12} weight="bold" />Copied</> : <><LinkSimple size={12} weight="bold" />Copy</>}
              </button>
            </div>
          </div>

          {/* Social */}
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
              Share to
            </label>
            <div className="grid grid-cols-3 gap-2">
              <ShareButton Icon={TwitterLogo} label="Twitter" onClick={() => shareOn('twitter')} />
              <ShareButton Icon={LinkedinLogo} label="LinkedIn" onClick={() => shareOn('linkedin')} />
              <ShareButton Icon={EnvelopeSimple} label="Email" onClick={() => shareOn('email')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ShareButton({ Icon, label, onClick }: { Icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 py-3 rounded-md border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-300 hover:text-white transition-colors"
    >
      <Icon size={16} weight="regular" />
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  )
}