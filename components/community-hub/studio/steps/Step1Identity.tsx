'use client'

import { StudioSectionCard, StudioField, StudioTipCard } from '../primitives'
import { LogoUploader } from '../LogoUploader'
import { SlugAvailabilityInput } from '../SlugAvailabilityInput'
import { normalizeSlug } from '@/lib/community/slugs'
import type { DraftData } from '@/lib/community/service.drafts'
import { Info } from 'lucide-react'

interface Props {
  data: DraftData
  patch: (p: Partial<DraftData>, opts?: { debounceMs?: number }) => void
  onSlugValidity: (valid: boolean) => void
  draftId: string
}

export function Step1Identity({ data, patch, onSlugValidity, draftId }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <StudioSectionCard
          title="Identity"
          description="Give your community a clear name and a short line about what it's for."
        >
          <div className="space-y-5">
            <StudioField
              label="Community name"
              htmlFor="name"
              counter={`${(data.name || '').length}/100`}
              hint="Use a name your members will remember."
            >
              <input
                id="name"
                value={data.name || ''}
                onChange={(e) => {
                  const name = e.target.value
                  const nextSlug = data.slug || normalizeSlug(name)
                  patch({ name, slug: nextSlug })
                }}
                maxLength={100}
                placeholder="e.g., DSRT Robotics Builders"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] focus:border-white/[0.18] outline-none px-3 py-2 text-[14px] text-white placeholder:text-white/25"
              />
            </StudioField>

            <StudioField
              label="Tagline"
              htmlFor="tagline"
              optional
              counter={`${(data.tagline || '').length}/140`}
              hint="One sentence that captures what makes this community special."
            >
              <input
                id="tagline"
                value={data.tagline || ''}
                onChange={(e) => patch({ tagline: e.target.value, short_description: e.target.value })}
                maxLength={140}
                placeholder="e.g., A place for builders exploring robotics and embedded systems."
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] focus:border-white/[0.18] outline-none px-3 py-2 text-[13.5px] text-white placeholder:text-white/25"
              />
            </StudioField>

            <StudioField
              label="URL slug"
              hint="Lowercase letters, numbers, and hyphens. This becomes your community URL."
            >
              <SlugAvailabilityInput
                value={data.slug || ''}
                onChange={(slug) => patch({ slug })}
                onValidityChange={onSlugValidity}
              />
            </StudioField>
          </div>
        </StudioSectionCard>

        <StudioSectionCard title="Visuals" description="Logo and cover shown on your public page.">
          <div className="grid gap-6 md:grid-cols-[auto_1fr]">
            <LogoUploader
              value={data.logo_url ?? null}
              onChange={(url, fileId) => patch({ logo_url: url, logo_file_id: fileId })}
              aspect="square"
              label="Logo"
              hint="Square. PNG or JPG. Up to 8MB."
              entityId={draftId}
            />
            <LogoUploader
              value={data.cover_url ?? null}
              onChange={(url, fileId) => patch({ cover_url: url, cover_file_id: fileId })}
              aspect="wide"
              label="Cover"
              hint="16:6 wide. Renders at top of the community page."
              entityId={draftId}
            />
          </div>
        </StudioSectionCard>
      </div>

      <div className="space-y-3">
        <StudioTipCard icon={Info} title="Identity tips">
          <p>Choose a name people can search for easily.</p>
          <p>Skip taglines that read like slogans — describe the audience, not the vibe.</p>
          <p>A logo helps recognition when your community appears in Discover.</p>
        </StudioTipCard>
      </div>
    </div>
  )
}