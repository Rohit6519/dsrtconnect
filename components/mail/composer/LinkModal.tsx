'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Link as LinkIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  initialUrl?: string
  initialText?: string
  onClose: () => void
  onConfirm: (data: { url: string; text: string }) => void
  onRemove?: () => void
  canRemove?: boolean
}

function normalizeUrl(raw: string): string | null {
  const clean = raw.trim()
  if (!clean || clean === 'https://' || clean === 'http://') return null
  if (/^https?:\/\//i.test(clean)) return clean
  if (/^mailto:/i.test(clean) || /^tel:/i.test(clean)) return clean
  if (/^[\w.-]+\.[\w.-]+/.test(clean)) return `https://${clean}`
  return null
}

export function LinkModal({
  open,
  initialUrl = '',
  initialText = '',
  onClose,
  onConfirm,
  onRemove,
  canRemove = false,
}: Props) {
  const [url, setUrl] = useState(initialUrl)
  const [text, setText] = useState(initialText)
  const [error, setError] = useState<string | null>(null)
  const urlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setUrl(initialUrl || 'https://')
    setText(initialText || '')
    setError(null)
    const t = window.setTimeout(() => urlRef.current?.focus(), 30)
    return () => window.clearTimeout(t)
  }, [open, initialUrl, initialText])

  if (!open) return null

  const submit = () => {
    const normalized = normalizeUrl(url)
    if (!normalized) {
      setError('Enter a valid URL (e.g. https://dsrtai.com)')
      return
    }
    onConfirm({
      url: normalized,
      text: text.trim() || normalized.replace(/^https?:\/\//i, ''),
    })
  }

  return (
    <div
      className="fixed inset-0 z-[20000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          'w-full max-w-[440px] rounded-2xl overflow-hidden',
          'bg-gradient-to-b from-[#141419] to-[#0a0a0f]',
          'border border-white/[0.1] shadow-2xl'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <LinkIcon className="w-4 h-4 text-white/70" weight="bold" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-white leading-tight">Insert link</h3>
              <p className="text-[11px] text-white/45 mt-0.5">Add a title and destination URL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-white/[0.06] text-white/50 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" weight="bold" />
          </button>
        </div>

        <div className="p-5 space-y-3.5">
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-white/45 mb-1.5">
              Title
            </label>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Display text (optional)"
              className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.18]"
            />
          </div>

          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-white/45 mb-1.5">
              URL
            </label>
            <input
              ref={urlRef}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                if (error) setError(null)
              }}
              placeholder="https://example.com"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submit()
                }
                if (e.key === 'Escape') onClose()
              }}
              className={cn(
                'w-full h-10 px-3 rounded-lg bg-white/[0.04] border text-[13px] text-white placeholder:text-white/30 focus:outline-none',
                error ? 'border-red-500/40 focus:border-red-500/60' : 'border-white/[0.08] focus:border-white/[0.18]'
              )}
            />
            {error && <p className="mt-1.5 text-[11px] text-red-300">{error}</p>}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div>
              {canRemove && onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  className="h-9 px-3 rounded-md text-[12.5px] font-semibold text-red-300/90 hover:text-red-300 hover:bg-red-500/10"
                >
                  Remove link
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-3 rounded-md text-[12.5px] font-semibold text-white/70 hover:text-white hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                className="h-9 px-4 rounded-md bg-white text-black text-[12.5px] font-bold hover:bg-zinc-200"
              >
                Insert link
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}