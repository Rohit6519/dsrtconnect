'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { RichEditorLite } from '../shared/RichEditorLite'
import { ProfileCard } from '../shared/ProfileCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Eye,
  PencilSimple,
  Check,
  User,
  Spinner,
  FloppyDisk,
} from '@phosphor-icons/react'

interface AboutMeSectionProps {
  aboutHtml: string | null
  bio: string | null            // fallback if about_me_html is empty (V1 data)
  isOwner: boolean
  onUpdate: (html: string, plain: string) => void
}

type Mode = 'view' | 'edit' | 'preview'

export function AboutMeSection({
  aboutHtml,
  bio,
  isOwner,
  onUpdate,
}: AboutMeSectionProps) {
  // Resolve initial content: rich HTML if present, else convert bio plain text to paragraphs
  const initialHtml = aboutHtml || (bio ? bioToHtml(bio) : '')

  const [mode, setMode] = useState<Mode>('view')
  const [draftHtml, setDraftHtml] = useState(initialHtml)
  const [savedHtml, setSavedHtml] = useState(initialHtml)
  const [saving, setSaving] = useState(false)

  // Reset when props change (e.g., after external refresh)
  useEffect(() => {
    const resolved = aboutHtml || (bio ? bioToHtml(bio) : '')
    setDraftHtml(resolved)
    setSavedHtml(resolved)
  }, [aboutHtml, bio])

  const isDirty = draftHtml !== savedHtml

  const stripHtml = (html: string): string => {
    if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '')
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  const save = async () => {
    const plain = stripHtml(draftHtml).trim()
    setSaving(true)
    try {
      const res = await fetch('/api/profile/about-me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: draftHtml, plain }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error || 'Failed')
      }
      setSavedHtml(draftHtml)
      onUpdate(draftHtml, plain)
      toast.success('About Me saved')
      setMode('view')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    if (isDirty && !confirm('Discard unsaved changes?')) return
    setDraftHtml(savedHtml)
    setMode('view')
  }

  // Insert image handler for rich editor
  const handleImageInsert = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) {
          resolve(null)
          return
        }
        if (file.size > 6 * 1024 * 1024) {
          toast.error('Image too large (max 6MB)')
          resolve(null)
          return
        }

        const fd = new FormData()
        fd.append('file', file)

        try {
          const res = await fetch('/api/profile/about-me/upload-image', {
            method: 'POST',
            body: fd,
          })
          if (!res.ok) throw new Error('Upload failed')
          const data = await res.json()
          resolve(data.url)
        } catch {
          toast.error('Failed to upload image')
          resolve(null)
        }
      }
      input.click()
    })
  }

  // ── Empty state (visitor OR owner with no content) ────────────────────
  const hasContent = !!(savedHtml && stripHtml(savedHtml).trim())

  if (!hasContent && !isOwner) {
    // Visitor and no content → hide entire card
    return null
  }

  return (
    <ProfileCard className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-zinc-500" weight="duotone" />
          <h2 className="text-[14px] font-bold text-zinc-100 tracking-tight">
            About Me
          </h2>
        </div>

        {/* Action buttons — differ by mode */}
        {isOwner && (
          <div className="flex items-center gap-1.5">
            {mode === 'view' && (
              <button
                onClick={() => setMode('edit')}
                className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-semibold text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
              >
                <PencilSimple className="w-3 h-3" weight="bold" />
                {hasContent ? 'Edit' : 'Write'}
              </button>
            )}

            {(mode === 'edit' || mode === 'preview') && (
              <>
                <button
                  onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-semibold text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors border border-zinc-800"
                >
                  {mode === 'edit' ? (
                    <>
                      <Eye className="w-3 h-3" weight="bold" />
                      Preview
                    </>
                  ) : (
                    <>
                      <PencilSimple className="w-3 h-3" weight="bold" />
                      Edit
                    </>
                  )}
                </button>

                <button
                  onClick={save}
                  disabled={saving || !isDirty}
                  className={cn(
                    'flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-semibold transition-colors',
                    isDirty && !saving
                      ? 'bg-white text-black hover:bg-zinc-100'
                      : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  )}
                >
                  {saving ? (
                    <>
                      <Spinner className="w-3 h-3 animate-spin" weight="bold" />
                      Saving
                    </>
                  ) : (
                    <>
                      <FloppyDisk className="w-3 h-3" weight="bold" />
                      Save
                    </>
                  )}
                </button>

                <button
                  onClick={cancel}
                  disabled={saving}
                  className="h-7 px-2 rounded-lg text-[11px] font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content area */}
      <AnimatePresence mode="wait">
        {mode === 'edit' && (
          <motion.div
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <RichEditorLite
              value={draftHtml}
              onChange={setDraftHtml}
              placeholder="Write about yourself, your journey, what you build, and what drives you..."
              toolbar="full"
              minHeight="240px"
              onImageInsert={handleImageInsert}
            />
            <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-600">
              <span>
                {isDirty ? (
                  <span className="text-yellow-500/80">● Unsaved changes</span>
                ) : (
                  'All changes saved'
                )}
              </span>
              <span>{stripHtml(draftHtml).length} chars</span>
            </div>
          </motion.div>
        )}

        {mode === 'preview' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-[240px]"
          >
            <div className="p-3 rounded-xl border border-zinc-800/60 bg-zinc-950/40">
              <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 mb-3">
                Preview
              </p>
              <RenderedAboutMe html={draftHtml} />
            </div>
          </motion.div>
        )}

        {mode === 'view' && (
          <motion.div
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {hasContent ? (
              <RenderedAboutMe html={savedHtml} />
            ) : (
              // Empty state — owner only (visitor case returned null above)
              <button
                onClick={() => setMode('edit')}
                className="w-full py-10 border-2 border-dashed border-zinc-800 rounded-xl text-[13px] text-zinc-600 italic hover:border-zinc-700 hover:text-zinc-400 transition-colors flex flex-col items-center gap-2"
              >
                <PencilSimple className="w-6 h-6" weight="duotone" />
                Tell your story — write about yourself, your journey, and what you build
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </ProfileCard>
  )
}

// ─── Rendered display ─────────────────────────────────────────────────────

function RenderedAboutMe({ html }: { html: string }) {
  return (
    <div
      className={cn(
        'text-[14px] text-zinc-300 leading-[1.7]',
        '[&_h1]:text-[22px] [&_h1]:font-bold [&_h1]:my-3 [&_h1]:text-white [&_h1]:tracking-tight',
        '[&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:my-3 [&_h2]:text-white [&_h2]:tracking-tight',
        '[&_h3]:text-[15.5px] [&_h3]:font-bold [&_h3]:my-2 [&_h3]:text-white [&_h3]:tracking-tight',
        '[&_p]:my-2',
        '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ul]:space-y-1',
        '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_ol]:space-y-1',
        '[&_li]:leading-[1.6]',
        '[&_strong]:text-white [&_strong]:font-bold',
        '[&_b]:text-white [&_b]:font-bold',
        '[&_a]:text-blue-400 [&_a]:underline [&_a]:decoration-blue-400/40 hover:[&_a]:decoration-blue-400',
        '[&_blockquote]:border-l-2 [&_blockquote]:border-zinc-700 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-zinc-400 [&_blockquote]:my-3',
        '[&_pre]:bg-zinc-900 [&_pre]:border [&_pre]:border-zinc-800 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:text-[12.5px] [&_pre]:font-mono [&_pre]:overflow-x-auto [&_pre]:my-3',
        '[&_code]:bg-zinc-900 [&_code]:border [&_code]:border-zinc-800 [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[12.5px] [&_code]:font-mono',
        '[&_img]:rounded-xl [&_img]:my-3 [&_img]:max-w-full [&_img]:border [&_img]:border-zinc-800',
        '[&_hr]:border-zinc-800 [&_hr]:my-4',
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Converts legacy plain-text bio into safe HTML paragraphs.
 * Splits on newlines, wraps each in <p>, escapes HTML.
 */
function bioToHtml(bio: string): string {
  if (!bio) return ''
  return bio
    .split(/\n\n+/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}