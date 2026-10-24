'use client'

import Link from 'next/link'
import { ErrorState } from '@/components/kernel-ui'
import { EventHeader } from './EventHeader'
import { RegisterPanel } from './RegisterPanel'
import { useEventDetail } from '@/hooks/useCommunityEvents'
import { DsrtPage, DsrtLayoutWithRail, DsrtPanel, DsrtSkeleton, DsrtSection } from '@/components/dsrt'

interface Props {
  slug: string
}

export function EventPublicPage({ slug }: Props) {
  const { data, loading, error, reload } = useEventDetail(slug)

  if (loading) return (
    <DsrtPage width="wide">
      <DsrtSkeleton className="h-64 w-full rounded-2xl mb-6" />
      <DsrtSkeleton className="h-96 w-full rounded-2xl" />
    </DsrtPage>
  )

  if (error || !data) {
    return (
      <DsrtPage width="narrow">
        <DsrtPanel>
          <ErrorState title="Could not load event" errorCode={error || 'UNKNOWN'} onRetry={reload} />
        </DsrtPanel>
      </DsrtPage>
    )
  }

  const { event, config, my_registration } = data

  return (
    <DsrtPage width="wide" className="space-y-6 py-6">
      <EventHeader event={event} config={config} />
      
      <DsrtLayoutWithRail
        railBreakpoint="lg"
        rail={
          <div className="space-y-4">
            <RegisterPanel
              event={event}
              config={config}
              myRegistration={my_registration}
              onChanged={reload}
            />
            <DsrtPanel padding="md">
              <p className="text-[11px] font-mono uppercase tracking-wider text-white/40 mb-3">Organized by</p>
              <Link href={`/community/${event.community_id}`} className="text-[14px] font-bold text-white hover:text-[#93c5fd] transition-colors">
                View Community
              </Link>
            </DsrtPanel>
          </div>
        }
      >
        <div className="space-y-6">
          {event.description && (
            <DsrtPanel>
              <DsrtSection title="About this event" headerVariant="mono">
                <p className="text-[14px] text-white/80 whitespace-pre-wrap leading-relaxed mt-2">{event.description}</p>
              </DsrtSection>
            </DsrtPanel>
          )}

          {event.meeting_url && my_registration?.status === 'CONFIRMED' && (
            <DsrtPanel variant="accent">
              <DsrtSection title="Meeting link" headerVariant="mono">
                <a href={event.meeting_url} target="_blank" rel="noreferrer" className="text-[14px] font-semibold text-white hover:underline break-all mt-1 block">
                  {event.meeting_url}
                </a>
              </DsrtSection>
            </DsrtPanel>
          )}
        </div>
      </DsrtLayoutWithRail>
    </DsrtPage>
  )
}