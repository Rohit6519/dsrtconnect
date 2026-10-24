'use client'

import { StudioSectionCard, StudioField, StudioTipCard } from '../primitives'
import { TopicChipsInput } from '../TopicChipsInput'
import type { DraftData } from '@/lib/community/service.drafts'
import { cn } from '@/lib/utils'
import { Info } from 'lucide-react'
import { CATEGORY_DATA } from '../../discover/CategoriesGrid'

const COMMUNITY_TYPES = [
  { key: 'university', label: 'University' },
  { key: 'organization', label: 'Organization' },
  { key: 'founders', label: 'Founders' },
  { key: 'technology', label: 'Technology' },
  { key: 'research', label: 'Research' },
  { key: 'open_source', label: 'Open Source' },
  { key: 'interest', label: 'Interest' },
]

const VISIBILITIES = [
  { key: 'PUBLIC', title: 'Public', body: 'Anyone can find and view this community.' },
  { key: 'PRIVATE', title: 'Private', body: 'Discoverable, but content restricted to members.' },
  { key: 'UNLISTED', title: 'Unlisted', body: 'Hidden from search. Accessible via direct link.' },
]

interface Props {
  data: DraftData
  patch: (p: Partial<DraftData>) => void
}

export function Step2Structure({ data, patch }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <StudioSectionCard title="Visibility" description="Who can see this community?">
          <div className="grid gap-2 md:grid-cols-3">
            {VISIBILITIES.map((v) => (
              <button
                key={v.key}
                onClick={() => patch({ visibility: v.key as any })}
                className={cn(
                  'text-left rounded-xl border p-3.5 transition-colors',
                  data.visibility === v.key
                    ? 'border-white/[0.2] bg-white/[0.06]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                )}
              >
                <p className="text-[13px] font-semibold text-white">{v.title}</p>
                <p className="mt-1 text-[11.5px] text-white/55 leading-relaxed">{v.body}</p>
              </button>
            ))}
          </div>
        </StudioSectionCard>

        <StudioSectionCard title="Category & type">
          <div className="space-y-5">
            <StudioField label="Community type">
              <div className="flex flex-wrap gap-1.5">
                {COMMUNITY_TYPES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => patch({ community_type: data.community_type === t.key ? undefined : t.key })}
                    className={cn(
                      'rounded-full border px-3 py-1 text-[11.5px] transition-colors',
                      data.community_type === t.key
                        ? 'border-white/[0.2] bg-white/[0.08] text-white'
                        : 'border-white/[0.06] bg-white/[0.02] text-white/70 hover:bg-white/[0.05]'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </StudioField>

            <StudioField label="Category" hint="Select the primary industry or vertical.">
              <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto pr-2 scrollbar-hide border border-white/[0.06] p-2 rounded-xl bg-white/[0.01]">
                {CATEGORY_DATA.map((c) => {
                  const Icon = c.icon
                  return (
                    <button
                      key={c.id}
                      onClick={() => patch({ category: c.id })}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition-colors',
                        data.category === c.id
                          ? 'border-white/[0.2] bg-white/[0.08] text-white'
                          : 'border-white/[0.06] bg-white/[0.02] text-white/70 hover:bg-white/[0.05]'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </StudioField>

            <StudioField label="Topics" hint="Up to 8 topics. Helps people discover your community.">
              <TopicChipsInput
                value={data.topics || []}
                onChange={(topics) => patch({ topics })}
              />
            </StudioField>
          </div>
        </StudioSectionCard>

        <StudioSectionCard title="Location & links" description="Where is your community based? Optional.">
          <div className="grid gap-4 md:grid-cols-2">
            <StudioField label="Location" optional htmlFor="loc">
              <input
                id="loc"
                value={data.location_text || ''}
                onChange={(e) => patch({ location_text: e.target.value })}
                placeholder="City, region, or 'Remote'"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] focus:border-white/[0.18] outline-none px-3 py-2 text-[13px] text-white placeholder:text-white/25"
              />
            </StudioField>
            <StudioField label="Website" optional htmlFor="web">
              <input
                id="web"
                value={data.website || ''}
                onChange={(e) => patch({ website: e.target.value })}
                placeholder="https://…"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] focus:border-white/[0.18] outline-none px-3 py-2 text-[13px] text-white placeholder:text-white/25"
              />
            </StudioField>
          </div>
        </StudioSectionCard>
      </div>

      <div className="space-y-3">
        <StudioTipCard icon={Info} title="Choosing structure">
          <p><strong>Public</strong> is best for growing communities.</p>
          <p><strong>Private</strong> is right when discussion should stay among members.</p>
          <p><strong>Unlisted</strong> suits invite-only cohorts.</p>
        </StudioTipCard>
      </div>
    </div>
  )
}