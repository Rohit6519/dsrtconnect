'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StudioShell } from '@/components/kernel-ui'
import { useCommunityDraft } from '@/hooks/useCommunityDraft'
import type { DraftData } from '@/lib/community/service.drafts'
import { Step1Identity } from './steps/Step1Identity'
import { Step2Structure } from './steps/Step2Structure'
import { Step3Membership } from './steps/Step3Membership'
import { Step4Governance } from './steps/Step4Governance'
import { Step5Roles } from './steps/Step5Roles'
import { Step6Preview } from './steps/Step6Preview'
import { Step7Launch } from './steps/Step7Launch'
import { StudioFooter } from './primitives'
import {
  BadgeCheck,
  Compass,
  UsersRound,
  ScrollText,
  Shield,
  Eye,
  Rocket,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner'

const STEPS = [
  { key: 'identity', label: 'Identity', icon: BadgeCheck },
  { key: 'structure', label: 'Structure', icon: Compass },
  { key: 'membership', label: 'Membership', icon: UsersRound },
  { key: 'governance', label: 'Governance', icon: ScrollText },
  { key: 'roles', label: 'Roles', icon: Shield },
  { key: 'preview', label: 'Preview', icon: Eye },
  { key: 'launch', label: 'Launch', icon: Rocket },
] as const

type StepKey = (typeof STEPS)[number]['key']

interface Props {
  draftId: string
}

export function CommunityStudioShell({ draftId }: Props) {
  const router = useRouter()
  const { draft, loading, status, statusText, patch, flush } = useCommunityDraft(draftId)
  const [slugValid, setSlugValid] = useState<boolean>(false)

  const currentStep: StepKey = (draft?.step as StepKey) || 'identity'
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep)

  const goto = useCallback(
    async (nextKey: StepKey) => {
      await flush({}, nextKey)
    },
    [flush]
  )

  const canContinue = useMemo(() => {
    if (!draft) return false
    const d = draft.data as DraftData
    if (currentStep === 'identity') {
      return !!(d.name && d.name.trim().length >= 3 && d.slug && slugValid)
    }
    if (currentStep === 'structure') {
      return !!(d.visibility && d.category)
    }
    if (currentStep === 'membership') {
      return !!d.join_policy
    }
    if (currentStep === 'governance') {
      return !!(d.rules && d.rules.length >= 1)
    }
    return true
  }, [draft, currentStep, slugValid])

  const onContinue = () => {
    const next = STEPS[currentIndex + 1]
    if (!next) return
    goto(next.key)
  }

  const onBack = () => {
    const prev = STEPS[currentIndex - 1]
    if (!prev) return
    goto(prev.key)
  }

  const onSaveExit = async () => {
    await flush({})
    toast.message('Draft saved')
    router.push('/my-communities')
  }

  if (loading || !draft) {
    return (
      <StudioShell
        title="Loading draft…"
        exitHref="/my-communities"
        navGroups={[]}
      >
        <div className="py-16 text-center text-[12.5px] text-white/50">Loading…</div>
      </StudioShell>
    )
  }

  const navGroups = [
    {
      label: 'Setup',
      items: STEPS.map((s, idx) => ({
        label: `${idx + 1}. ${s.label}`,
        href: `#${s.key}`,
        icon: s.icon,
      })),
    },
  ]

  const data = draft.data as DraftData

  return (
    <StudioShell
      title={data.name || 'New community'}
      subtitle="Community Studio"
      exitHref="/my-communities"
      exitLabel="Save & exit"
      status={status}
      statusText={statusText}
      navGroups={[
        {
          label: 'Setup',
          items: STEPS.map((s, idx) => ({
            label: `${idx + 1}. ${s.label}`,
            href: `#${s.key}`,
            icon: s.icon,
            disabled: idx > currentIndex + 1, // don't allow skipping too far
          })),
        },
      ]}
    >
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2 text-[11.5px] font-mono uppercase tracking-wider text-white/40">
        <span>Step {currentIndex + 1} of {STEPS.length}</span>
        <span className="opacity-40">·</span>
        <span className="text-white/70">{STEPS[currentIndex].label}</span>
      </div>

      {currentStep === 'identity' && (
        <Step1Identity
          data={data}
          patch={patch}
          onSlugValidity={setSlugValid}
          draftId={draftId}
        />
      )}
      {currentStep === 'structure' && <Step2Structure data={data} patch={patch} />}
      {currentStep === 'membership' && <Step3Membership data={data} patch={patch} />}
      {currentStep === 'governance' && <Step4Governance data={data} patch={patch} />}
      {currentStep === 'roles' && <Step5Roles />}
      {currentStep === 'preview' && <Step6Preview data={data} />}
      {currentStep === 'launch' && (
        <Step7Launch
          data={data}
          draftId={draftId}
          onPublished={() => {}}
        />
      )}

      <div className="mt-8">
        {currentStep !== 'launch' ? (
          <StudioFooter
            onBack={currentIndex > 0 ? onBack : undefined}
            onContinue={onContinue}
            onSaveExit={onSaveExit}
            disabled={!canContinue}
          />
        ) : (
          <StudioFooter
            onBack={onBack}
            onSaveExit={onSaveExit}
          />
        )}
      </div>
    </StudioShell>
  )
}