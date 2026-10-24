'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Warning, ArrowUpRight, CheckCircle } from '@phosphor-icons/react'
import { StatusRibbon } from './parts/StatusRibbon'
import { JourneySteps } from './parts/JourneySteps'
import { NextActionBanner } from './parts/NextActionBanner'
import { CuratedTimeline } from './parts/CuratedTimeline'
import { MessageThread } from './parts/MessageThread'
import { MessageComposer } from './parts/MessageComposer'
import { InterviewCard } from './parts/InterviewCard'
import { DocumentsPanel } from './parts/DocumentsPanel'
import { AvailabilityDrawer } from './parts/AvailabilityDrawer'
import { WithdrawModal } from '../WithdrawModal'
import {
  DsrtPage,
  DsrtLayoutWithRail,
  DsrtPanel,
  DsrtButton,
  DsrtEmpty,
  DsrtSkeleton,
  DsrtAvatar,
} from '@/components/dsrt'

export function ApplicantPortalShell({ applicationId }: { applicationId: string }) {
  const router = useRouter()
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAvailability, setShowAvailability] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(`/api/applications/${applicationId}/portal`, { cache: 'no-store' })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Failed')
      setData(d)
    } catch (e: any) {
      setError(e?.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!data) return
    fetch(`/api/applications/${applicationId}/mark-read`, { method: 'POST' }).catch(() => {})
  }, [data, applicationId])

  useEffect(() => {
    const start = () => {
      if (pollRef.current) return
      pollRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') load()
      }, 30000)
    }
    const stop = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
    start()
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        load()
        start()
      } else stop()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [load])

  const handleWithdraw = async (reason: string, note: string) => {
    setWithdrawing(true)
    try {
      const res = await fetch(`/api/opportunities/${data.opportunity.id}/apply`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error('Failed to withdraw')
      router.push('/looking-for/my-applications')
    } catch (e: any) {
      alert(e?.message || 'Withdraw failed')
    } finally {
      setWithdrawing(false)
      setShowWithdraw(false)
    }
  }

  if (loading) {
    return (
      <DsrtPage width="default" className="space-y-4">
        <DsrtSkeleton className="h-6 w-40" />
        <DsrtSkeleton className="h-24 w-full rounded-2xl" />
        <DsrtSkeleton className="h-48 w-full rounded-2xl" />
        <DsrtSkeleton className="h-64 w-full rounded-2xl" />
      </DsrtPage>
    )
  }

  if (error || !data) {
    return (
      <DsrtPage width="narrow">
        <DsrtEmpty
          icon={Warning}
          title={error || 'Not found'}
          action={
            <DsrtButton asChild variant="outline" size="sm">
              <Link href="/looking-for/my-applications">← Back to My Applications</Link>
            </DsrtButton>
          }
        />
      </DsrtPage>
    )
  }

  const { application, opportunity, events, messages, interviews, my_availability_slots, documents } =
    data
  const canWithdraw = !['withdrawn', 'rejected', 'hired', 'draft'].includes(
    application.pipeline_stage
  )

  return (
    <div className="min-h-screen bg-[#05070D] text-white">
      <DsrtPage width="default" className="space-y-6">
        <Link
          href="/looking-for/my-applications"
          className="inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-wider text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft size={12} weight="bold" /> My Applications
        </Link>

        <StatusRibbon application={application} opportunity={opportunity} />

        <DsrtLayoutWithRail
          railBreakpoint="lg"
          rail={
            <div className="space-y-4">
              <DsrtPanel variant="default" padding="md">
                <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-white/40 mb-4">
                  Actions
                </h3>
                <div className="space-y-2">
                  <DsrtButton asChild variant="outline" size="sm" fullWidth>
                    <Link href={`/looking-for/${opportunity.slug || opportunity.id}`}>
                      View Opportunity <ArrowUpRight size={12} weight="bold" />
                    </Link>
                  </DsrtButton>
                  <DsrtButton
                    variant="subtle"
                    size="sm"
                    fullWidth
                    onClick={() => setShowAvailability(true)}
                  >
                    Share your availability
                  </DsrtButton>
                  {canWithdraw && (
                    <DsrtButton
                      variant="danger"
                      size="sm"
                      fullWidth
                      onClick={() => setShowWithdraw(true)}
                    >
                      Withdraw Application
                    </DsrtButton>
                  )}
                </div>
              </DsrtPanel>

              <DocumentsPanel documents={documents} application={application} />

              {opportunity.poster && (
                <DsrtPanel variant="default" padding="md">
                  <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-white/40 mb-4">
                    Posted By
                  </h3>
                  <div className="flex items-center gap-3">
                    <DsrtAvatar
                      src={opportunity.poster.avatar_url}
                      name={opportunity.poster.full_name}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-white truncate flex items-center gap-1.5">
                        {opportunity.poster.full_name}
                        {opportunity.poster.is_verified && (
                          <CheckCircle size={12} weight="fill" className="text-[#93c5fd]" />
                        )}
                      </div>
                      <div className="text-[11.5px] text-white/40">@{opportunity.poster.username}</div>
                    </div>
                  </div>
                  <Link
                    href={`/profile/${opportunity.poster.username}`}
                    className="mt-3 inline-flex items-center gap-1 text-[11.5px] text-white/50 hover:text-white transition-colors"
                  >
                    View profile <ArrowUpRight size={10} weight="bold" />
                  </Link>
                </DsrtPanel>
              )}
            </div>
          }
        >
          <div className="space-y-5 min-w-0">
            <NextActionBanner
              application={application}
              interviews={interviews}
              onOpenAvailability={() => setShowAvailability(true)}
            />

            <JourneySteps application={application} />

            {interviews.length > 0 && (
              <div className="space-y-3">
                {interviews.map((iv: any) => (
                  <InterviewCard key={iv.id} interview={iv} onRefresh={load} />
                ))}
              </div>
            )}

            <DsrtPanel padding="none" variant="default" className="overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-white">Messages</h3>
                {messages.length > 0 && (
                  <span className="text-[11px] font-mono text-white/40">
                    {messages.length} in thread
                  </span>
                )}
              </div>
              <div className="p-4 max-h-[520px] overflow-y-auto">
                <MessageThread messages={messages} counterparty={opportunity.poster} />
              </div>
              <div className="border-t border-white/[0.06] p-3">
                <MessageComposer applicationId={application.id} onSent={load} />
              </div>
            </DsrtPanel>

            <CuratedTimeline events={events} />
          </div>
        </DsrtLayoutWithRail>
      </DsrtPage>

      {showAvailability && (
        <AvailabilityDrawer
          applicationId={application.id}
          existing={my_availability_slots}
          onClose={() => setShowAvailability(false)}
          onSaved={() => {
            setShowAvailability(false)
            load()
          }}
        />
      )}

      <WithdrawModal
        isOpen={showWithdraw}
        opportunityTitle={opportunity.title}
        isLoading={withdrawing}
        onConfirm={handleWithdraw}
        onCancel={() => setShowWithdraw(false)}
      />
    </div>
  )
}