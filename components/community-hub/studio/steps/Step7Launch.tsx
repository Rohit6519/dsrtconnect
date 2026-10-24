'use client'

import { useState } from 'react'
import { StudioSectionCard, StudioTipCard } from '../primitives'
import { CheckCircle2, Info, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DraftData } from '@/lib/community/service.drafts'
import { toast } from '@/components/ui/sonner'
import { useRouter } from 'next/navigation'

interface CheckItem {
  key: string
  label: string
  ok: boolean
}

function computeChecklist(data: DraftData): CheckItem[] {
  return [
    { key: 'name', label: 'Community name is set', ok: !!(data.name && data.name.trim().length >= 3) },
    { key: 'tagline', label: 'Tagline / short description', ok: !!(data.tagline && data.tagline.trim().length >= 10) },
    { key: 'slug', label: 'URL slug set', ok: !!(data.slug && data.slug.length >= 3) },
    { key: 'visibility', label: 'Visibility chosen', ok: !!data.visibility },
    { key: 'join_policy', label: 'Join policy chosen', ok: !!data.join_policy },
    { key: 'category', label: 'Category selected', ok: !!data.category },
    { key: 'rules', label: 'At least one rule added', ok: !!(data.rules && data.rules.length >= 1) },
  ]
}

interface Props {
  data: DraftData
  draftId: string
  onPublished: (result: { community_id: string; slug: string; public_id: string }) => void
}

export function Step7Launch({ data, draftId, onPublished }: Props) {
  const [publishing, setPublishing] = useState(false)
  const router = useRouter()
  const checks = computeChecklist(data)
  const allOk = checks.every((c) => c.ok)

  const publish = async () => {
    if (!allOk) {
      toast.error('Please resolve the checklist before publishing')
      return
    }
    setPublishing(true)
    try {
      const res = await fetch(`/api/v1/community/drafts/${draftId}/publish`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error?.message || 'Publish failed')
        setPublishing(false)
        return
      }
      toast.success('Community published')
      onPublished(json.data)
      router.push(`/community/${json.data.slug}`)
    } catch {
      toast.error('Network error')
      setPublishing(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <StudioSectionCard
          title="Ready to launch"
          description="Review the checklist. When everything passes, publish your community."
        >
          <div className="space-y-2">
            {checks.map((c) => (
              <div
                key={c.key}
                className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.015] p-3"
              >
                {c.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" strokeWidth={1.75} />
                ) : (
                  <XCircle className="w-4 h-4 text-red-300/80 flex-shrink-0" strokeWidth={1.75} />
                )}
                <p className={cn('text-[12.5px]', c.ok ? 'text-white/80' : 'text-white/60')}>
                  {c.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={publish}
              disabled={!allOk || publishing}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-[12.5px] font-semibold transition-colors',
                allOk
                  ? 'bg-white text-black hover:bg-zinc-100'
                  : 'bg-white/[0.06] text-white/40 cursor-not-allowed'
              )}
            >
              {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {publishing ? 'Publishing…' : 'Publish community'}
            </button>
          </div>
        </StudioSectionCard>
      </div>

      <div className="space-y-3">
        <StudioTipCard icon={Info} title="After publish">
          <p>You'll be redirected to the public page.</p>
          <p>Everything is editable from Studio → Settings later.</p>
          <p>The community appears in Discover within a few seconds.</p>
        </StudioTipCard>
      </div>
    </div>
  )
}