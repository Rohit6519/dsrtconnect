'use client'

import { ArrowLeft, BookmarkSimple, ShareNetwork, Flag } from '@phosphor-icons/react'
import { SmartApplyButton } from '@/components/looking-for/application-studio/SmartApplyButton'
import { DsrtTabs, DsrtButton } from '@/components/dsrt'
import { cn } from '@/lib/utils'

interface Props {
  opportunity: any
  tab: 'opportunity' | 'about-poster'
  onTabChange: (t: 'opportunity' | 'about-poster') => void
  isOwner: boolean
  isClosed: boolean
  hasApplied: boolean
  onApply: () => void
  onSave: () => void
  onShare: () => void
  onReport: () => void
  onBack: () => void
}

export function OpportunityHeader({
  opportunity,
  tab,
  onTabChange,
  isOwner,
  isClosed,
  onSave,
  onShare,
  onReport,
  onBack,
}: Props) {
  return (
    <header className="sticky top-0 z-30 bg-[#05070D]/95 backdrop-blur-md border-b border-white/[0.06]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-wider text-white/50 hover:text-white transition-colors shrink-0"
        >
          <ArrowLeft size={12} weight="bold" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <IconAction
            Icon={BookmarkSimple}
            label={opportunity.is_saved ? 'Saved' : 'Save'}
            onClick={onSave}
            active={opportunity.is_saved}
          />
          <IconAction Icon={ShareNetwork} label="Share" onClick={onShare} />
          <IconAction Icon={Flag} label="Report" onClick={onReport} />

          <SmartApplyButton
            opportunity={opportunity}
            isOwner={isOwner}
            isClosed={isClosed}
            className="inline-flex h-8 min-w-[110px] sm:min-w-[130px] text-[12px] px-3 rounded-lg whitespace-nowrap"
          />
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <DsrtTabs
          variant="underline"
          tabs={[
            { value: 'opportunity', label: 'Opportunity' },
            { value: 'about-poster', label: 'About the Poster' },
          ]}
          activeValue={tab}
          onValueChange={(v) => onTabChange(v as 'opportunity' | 'about-poster')}
        />
      </div>
    </header>
  )
}

function IconAction({
  Icon,
  label,
  onClick,
  active,
}: {
  Icon: any
  label: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center gap-1.5 h-8 px-2 sm:px-2.5 rounded-lg border text-[12px] font-medium transition-colors',
        active
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
          : 'border-white/[0.08] hover:border-white/[0.16] text-white/50 hover:text-white'
      )}
    >
      <Icon size={12} weight={active ? 'fill' : 'regular'} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}