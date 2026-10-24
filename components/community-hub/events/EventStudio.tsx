'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StudioShell } from '@/components/kernel-ui'
import { Calendar, MapPin, Ticket, MessageSquare, Rocket } from 'lucide-react'
import { StudioSectionCard, StudioField, StudioFooter } from '@/components/community-hub/studio/primitives'
import { LogoUploader } from '@/components/community-hub/studio/LogoUploader'
import { toast } from '@/components/ui/sonner'
import { DsrtInput, DsrtTextarea, DsrtButton, DsrtPanel, DsrtSection } from '@/components/dsrt'
import { cn } from '@/lib/utils'

const STEPS = [
  { key: 'basics', label: 'Basics', icon: Calendar },
  { key: 'schedule', label: 'Location', icon: MapPin },
  { key: 'registration', label: 'Tickets', icon: Ticket },
  { key: 'communication', label: 'Comms', icon: MessageSquare },
  { key: 'review', label: 'Publish', icon: Rocket },
] as const

type StepKey = (typeof STEPS)[number]['key']

interface Props {
  slug: string
  communityId: string
  eventId?: string
}

export function EventStudio({ slug, communityId, eventId }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<StepKey>('basics')
  const [loading, setLoading] = useState(!!eventId)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [event, setEvent] = useState<any>(null)
  const [form, setForm] = useState<any>({
    title: '', tagline: '', description: '', event_type: 'GENERAL',
    is_online: true, location_text: '', meeting_url: '', timezone: 'UTC',
    cover_url: null, cover_file_id: null, starts_at: '', ends_at: '',
    registration: { capacity: null, waitlist_enabled: true, require_approval: false, members_only: false },
  })

  useEffect(() => {
    if (!eventId) return
    fetch(`/api/v1/community/events/${eventId}`)
      .then(r => r.json())
      .then(j => {
        const e = j?.data?.event; const c = j?.data?.config
        if (e) {
          setEvent(e)
          setForm((f: any) => ({
            ...f, title: e.title, tagline: e.tagline || '', description: e.description || '',
            event_type: e.event_type, is_online: e.is_online, location_text: e.location_text || '',
            meeting_url: e.meeting_url || '', timezone: e.timezone || 'UTC',
            cover_url: e.cover_url, cover_file_id: e.cover_file_id,
            starts_at: e.starts_at?.slice(0, 16) || '', ends_at: e.ends_at?.slice(0, 16) || '',
            registration: {
              capacity: c?.capacity ?? null, waitlist_enabled: c?.waitlist_enabled ?? true,
              require_approval: c?.require_approval ?? false, members_only: c?.members_only ?? false,
            },
          }))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [eventId])

  const currentIndex = STEPS.findIndex(s => s.key === step)
  const canContinue = useMemo(() => {
    if (step === 'basics') return !!form.title?.trim()
    if (step === 'schedule') return !!form.starts_at
    return true
  }, [step, form])

  const save = async (): Promise<any> => {
    setSaving(true)
    try {
      const payload = { ...form, starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null, ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null, community_id: communityId }
      const res = await fetch(eventId ? `/api/v1/community/events/${eventId}` : '/api/v1/community/events', {
        method: eventId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `evt-${communityId}-${Date.now()}` },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) { toast.error('Save failed'); return null }
      const e = json?.data?.event
      if (e && !eventId) router.replace(`/community/${slug}/studio/events/${e.id}/edit`)
      else if (e) setEvent(e)
      toast.success('Saved')
      return e
    } finally { setSaving(false) }
  }

  const publish = async () => {
    let target = event
    if (!target) target = await save()
    if (!target) return
    setPublishing(true)
    try {
      const res = await fetch(`/api/v1/community/events/${target.id}/publish`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'REGISTRATION_OPEN' }),
      })
      if (!res.ok) { toast.error('Publish failed'); return }
      toast.success('Event published')
      router.push(`/community/${slug}/events/${target.slug}`)
    } finally { setPublishing(false) }
  }

  const next = async () => { await save(); const n = STEPS[currentIndex + 1]; if (n) setStep(n.key) }
  const back = () => { const p = STEPS[currentIndex - 1]; if (p) setStep(p.key) }

  return (
    <StudioShell
      title={form.title || 'New event'}
      subtitle="Event Studio"
      exitHref={`/community/${slug}/studio`}
      exitLabel="Save & exit"
      status={saving ? 'saving' : 'saved'}
      navGroups={[{
        label: 'Event Studio',
        items: STEPS.map((s, i) => ({ label: `${i + 1}. ${s.label}`, href: `#${s.key}`, icon: s.icon, disabled: i > currentIndex + 1 })),
      }]}
    >
      <div className="mb-6 flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-white/50">
        <span>Step {currentIndex + 1} of {STEPS.length}</span>
        <span className="opacity-40">·</span>
        <span className="text-[#93c5fd]">{STEPS[currentIndex].label}</span>
      </div>

      {step === 'basics' && (
        <StudioSectionCard title="Basics" description="Give your event a title, a short tagline, and a cover image.">
          <StudioField label="Title" htmlFor="title" counter={`${form.title.length}/300`}>
            <DsrtInput id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={300} placeholder="e.g., Robotics Kickoff Meetup" />
          </StudioField>
          <StudioField label="Tagline" optional counter={`${form.tagline.length}/300`}>
            <DsrtInput value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} maxLength={300} placeholder="One-liner that hooks attendees." />
          </StudioField>
          <StudioField label="Description" optional>
            <DsrtTextarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={6} placeholder="What should attendees expect?" />
          </StudioField>
          <StudioField label="Event type">
            <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="w-full bg-[#0a0a0f] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-white focus:outline-none focus:border-[#2c5282]">
              {['GENERAL', 'WORKSHOP', 'MEETUP', 'HACKATHON', 'CONFERENCE', 'AMA'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </StudioField>
          <StudioField label="Cover image" optional>
            <LogoUploader value={form.cover_url} onChange={(url, fileId) => setForm({ ...form, cover_url: url, cover_file_id: fileId })} aspect="wide" label="Event cover" hint="16:6 ratio" entityId={communityId} />
          </StudioField>
        </StudioSectionCard>
      )}

      {step === 'schedule' && (
        <StudioSectionCard title="Schedule & Location">
          <div className="grid gap-4 md:grid-cols-2">
            <StudioField label="Starts at" htmlFor="starts_at">
              <DsrtInput type="datetime-local" id="starts_at" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </StudioField>
            <StudioField label="Ends at" optional>
              <DsrtInput type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </StudioField>
          </div>
          <StudioField label="Timezone">
            <DsrtInput value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} placeholder="UTC / Asia/Kolkata..." className="font-mono" />
          </StudioField>
          <StudioField label="Mode">
            <select value={form.is_online ? 'online' : 'person'} onChange={(e) => setForm({ ...form, is_online: e.target.value === 'online' })} className="w-full bg-[#0a0a0f] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-white focus:outline-none focus:border-[#2c5282]">
              <option value="online">Online / Virtual</option>
              <option value="person">In-person</option>
            </select>
          </StudioField>
          {form.is_online ? (
            <StudioField label="Meeting URL" optional>
              <DsrtInput value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} placeholder="https://meet.google.com/..." className="font-mono" />
            </StudioField>
          ) : (
            <StudioField label="Venue Address">
              <DsrtInput value={form.location_text} onChange={(e) => setForm({ ...form, location_text: e.target.value })} placeholder="Venue address, city..." />
            </StudioField>
          )}
        </StudioSectionCard>
      )}

      {step === 'registration' && (
        <StudioSectionCard title="Registration" description="Capacity, waitlist, and access controls.">
          <StudioField label="Capacity" optional hint="Leave empty for unlimited.">
            <DsrtInput type="number" min={1} value={form.registration.capacity ?? ''} onChange={(e) => setForm({ ...form, registration: { ...form.registration, capacity: e.target.value ? parseInt(e.target.value) : null } })} placeholder="e.g., 100" />
          </StudioField>
          <div className="space-y-2 mt-4">
            <Toggle label="Enable waitlist when full" v={!!form.registration.waitlist_enabled} onChange={(v) => setForm({ ...form, registration: { ...form.registration, waitlist_enabled: v } })} />
            <Toggle label="Members-only event" v={!!form.registration.members_only} onChange={(v) => setForm({ ...form, registration: { ...form.registration, members_only: v } })} />
            <Toggle label="Require approval" v={!!form.registration.require_approval} onChange={(v) => setForm({ ...form, registration: { ...form.registration, require_approval: v } })} />
          </div>
        </StudioSectionCard>
      )}

      {step === 'communication' && (
        <DsrtPanel padding="lg">
          <DsrtSection title="Communication" description="Reminders are sent 24h and 1h before the event automatically." />
        </DsrtPanel>
      )}

      {step === 'review' && (
        <DsrtPanel padding="lg">
          <DsrtSection title="Ready to publish?" description="Publishing opens registration immediately.">
            <ul className="space-y-3 mt-4 text-[13px] font-medium text-white/80">
              <li><strong className="text-white block text-[11px] font-mono text-white/40 mb-1">Title</strong> {form.title}</li>
              <li><strong className="text-white block text-[11px] font-mono text-white/40 mb-1">Time</strong> {form.starts_at ? new Date(form.starts_at).toLocaleString() : '—'}</li>
              <li><strong className="text-white block text-[11px] font-mono text-white/40 mb-1">Access</strong> Capacity: {form.registration.capacity ?? 'Unlimited'} · {form.registration.members_only ? 'Members only' : 'Open to all'}</li>
            </ul>
            <div className="mt-8 pt-6 border-t border-white/[0.06] flex items-center justify-end gap-3">
              <DsrtButton variant="ghost" onClick={save} loading={saving}>Save Draft</DsrtButton>
              <DsrtButton variant="primary" onClick={publish} loading={publishing}>Publish Event</DsrtButton>
            </div>
          </DsrtSection>
        </DsrtPanel>
      )}

      <div className="mt-8">
        <StudioFooter
          onBack={currentIndex > 0 ? back : undefined}
          onContinue={currentIndex < STEPS.length - 1 ? next : undefined}
          onSaveExit={async () => { await save(); router.push(`/community/${slug}/studio`) }}
          disabled={!canContinue}
          loading={saving}
        />
      </div>
    </StudioShell>
  )
}

function Toggle({ label, v, onChange }: { label: string; v: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] cursor-pointer">
      <span className="text-[13px] font-medium text-white/90">{label}</span>
      <span className={cn('relative inline-flex h-5 w-9 rounded-full transition-colors border', v ? 'bg-white border-white' : 'bg-white/[0.04] border-white/[0.1]')}>
        <input type="checkbox" className="sr-only" checked={v} onChange={(e) => onChange(e.target.checked)} />
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full transition-transform', v ? 'left-4 bg-black' : 'left-0.5 bg-white')} />
      </span>
    </label>
  )
}