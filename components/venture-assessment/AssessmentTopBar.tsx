'use client'

import Link from 'next/link'
import { useState } from 'react'
import { SignOut, CircleNotch } from '@phosphor-icons/react'
import { useAssessment } from './AssessmentContext'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function AssessmentTopBar() {
  const router = useRouter()
  const { slug, flushPending, saveStatus, lastSavedAt, isDirty } = useAssessment()
  const [saving, setSaving] = useState(false)

  const handleSaveExit = async () => {
    setSaving(true)
    try {
      await flushPending()
      toast.success('Progress saved')
      router.push(`/ventures/${slug}`)
    } catch {
      toast.error('Could not save — try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#09090b]/95 backdrop-blur-md">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/ventures" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-zinc-700 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-zinc-400" />
          </div>
          <span className="text-[15px] font-bold text-white tracking-tight">DSRT Connect</span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-[11.5px] text-zinc-500">
            {saveStatus === 'saving' && (
              <>
                <CircleNotch size={11} className="animate-spin" />
                <span>Saving…</span>
              </>
            )}
            {saveStatus === 'saved' && lastSavedAt && (
              <span>Saved {formatRelativeTime(lastSavedAt)}</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-orange-400">Save failed — retrying</span>
            )}
            {saveStatus === 'idle' && isDirty && (
              <span className="text-zinc-400">Unsaved changes</span>
            )}
          </div>

          <button
            onClick={handleSaveExit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-[12.5px] font-medium text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
          >
            {saving ? <CircleNotch size={12} className="animate-spin" /> : <SignOut size={12} />}
            Save & exit
          </button>
        </div>
      </div>
    </div>
  )
}

function formatRelativeTime(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
}