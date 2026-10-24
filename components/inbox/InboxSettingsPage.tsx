'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Check, CircleNotch, Warning,
  Bell, BookOpen, Signature, AirplaneTilt, Keyboard
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface InboxSettings {
  user_id: string
  signature: string | null
  signature_html: string | null
  use_signature_on_reply: boolean
  notify_new_message: boolean
  notify_new_connection: boolean
  notify_application: boolean
  notify_dsrt_official: boolean
  notify_digest_frequency: string
  notify_email: boolean
  notify_push: boolean
  reading_pane: string
  messages_per_page: number
  auto_mark_read_seconds: number
  keyboard_shortcuts_enabled: boolean
  default_font: string
  default_font_size: string
  send_and_archive: boolean
  vacation_enabled: boolean
  vacation_subject: string | null
  vacation_message: string | null
  vacation_start_date: string | null
  vacation_end_date: string | null
}

type SectionKey = 'notifications' | 'reading' | 'signature' | 'vacation' | 'shortcuts'

const SECTIONS: Array<{ key: SectionKey; label: string; description: string; icon: any }> = [
  { key: 'notifications', label: 'Notifications', description: 'Alerts, email digests, push', icon: Bell },
  { key: 'reading',       label: 'Reading',       description: 'Density, pagination, behavior', icon: BookOpen },
  { key: 'signature',     label: 'Signature',     description: 'Personal sign-off block',       icon: Signature },
  { key: 'vacation',      label: 'Away',          description: 'Vacation auto-responder',       icon: AirplaneTilt },
  { key: 'shortcuts',     label: 'Shortcuts',     description: 'Keyboard productivity',         icon: Keyboard },
]

export function InboxSettingsPage() {
  const [settings, setSettings] = useState<InboxSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<SectionKey>('notifications')

  useEffect(() => {
    fetch('/api/inbox/settings')
      .then((r) => r.json())
      .then((d) => { setSettings(d.settings); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const save = useCallback(async (patch: Partial<InboxSettings>) => {
    if (!settings) return
    const merged = { ...settings, ...patch }
    setSettings(merged)
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/inbox/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [settings])

  const statusEl = useMemo(() => {
    if (saving) return (
      <div className="inline-flex items-center gap-1.5 text-[11.5px] text-white/55 font-medium">
        <CircleNotch size={12} className="animate-spin" /> Saving
      </div>
    )
    if (saved) return (
      <div className="inline-flex items-center gap-1.5 text-[11.5px] text-emerald-400 font-medium">
        <Check size={12} weight="bold" /> Saved
      </div>
    )
    return null
  }, [saving, saved])

  return (
    <div className="min-h-[calc(100vh-76px)] bg-gradient-to-b from-[#08080c] via-[#0a0a10] to-[#050508] text-white">
      {/* Header bar */}
      <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-gradient-to-b from-[#0d0d13] via-[#0b0b10] to-[#08080c]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/inbox"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-white/80 hover:text-white text-[12.5px] font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" weight="bold" />
              Back to Mail
            </Link>
            <div className="w-px h-6 bg-white/[0.08]" />
            <div>
              <h1 className="text-[18px] font-bold text-white leading-tight">Inbox Settings</h1>
              <p className="text-[11.5px] text-white/45 mt-0.5">
                Preferences apply across all your DSRT Mail identities
              </p>
            </div>
          </div>
          <div className="min-w-[80px] flex justify-end">{statusEl}</div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/[0.05] text-[12px] text-red-300">
            <Warning size={13} weight="fill" className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Section nav */}
          <aside className="col-span-12 md:col-span-3">
            <div className="rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-2 sticky top-[92px]">
              {SECTIONS.map((s) => {
                const Icon = s.icon
                const isActive = active === s.key
                return (
                  <button
                    key={s.key}
                    onClick={() => setActive(s.key)}
                    className={cn(
                      'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                      isActive
                        ? 'bg-white/[0.08] text-white'
                        : 'text-white/60 hover:bg-white/[0.04] hover:text-white/90'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 border',
                      isActive ? 'bg-white/[0.09] border-white/[0.14]' : 'bg-white/[0.02] border-white/[0.05]'
                    )}>
                      <Icon className="w-4 h-4" weight={isActive ? 'fill' : 'regular'} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold leading-tight">{s.label}</p>
                      <p className="text-[10.5px] text-white/45 mt-0.5 leading-snug">{s.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* Content */}
          <main className="col-span-12 md:col-span-9 space-y-5">
            {loading || !settings ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                {active === 'notifications' && (
                  <>
                    <Card title="Alerts" description="Choose which events notify you inside DSRT Mail">
                      <ToggleRow label="New messages" description="When someone sends you a message" checked={settings.notify_new_message} onChange={(v) => save({ notify_new_message: v })} />
                      <ToggleRow label="Connection requests" description="When someone wants to connect" checked={settings.notify_new_connection} onChange={(v) => save({ notify_new_connection: v })} />
                      <ToggleRow label="Applications" description="When someone applies to your venture or project" checked={settings.notify_application} onChange={(v) => save({ notify_application: v })} />
                      <ToggleRow label="DSRT official" description="Important updates from DSRT" checked={settings.notify_dsrt_official} onChange={(v) => save({ notify_dsrt_official: v })} />
                    </Card>

                    <Card title="Delivery channels" description="How and when digests reach you">
                      <ToggleRow label="Email notifications" description="Receive notifications by email" checked={settings.notify_email} onChange={(v) => save({ notify_email: v })} />
                      <ToggleRow label="Push notifications" description="Browser push notifications" checked={settings.notify_push} onChange={(v) => save({ notify_push: v })} />
                      <SelectRow
                        label="Digest frequency"
                        description="How often to receive email digests"
                        value={settings.notify_digest_frequency}
                        onChange={(v) => save({ notify_digest_frequency: v })}
                        options={[
                          { value: 'realtime', label: 'Real-time' },
                          { value: 'hourly',   label: 'Hourly' },
                          { value: 'daily',    label: 'Daily' },
                          { value: 'weekly',   label: 'Weekly' },
                          { value: 'never',    label: 'Never' },
                        ]}
                      />
                    </Card>
                  </>
                )}

                {active === 'reading' && (
                  <Card title="Reading" description="How mail is displayed and marked">
                    <SelectRow
                      label="Messages per page"
                      description="Threads per pagination view"
                      value={String(settings.messages_per_page)}
                      onChange={(v) => save({ messages_per_page: parseInt(v) })}
                      options={[
                        { value: '15', label: '15' },
                        { value: '25', label: '25' },
                        { value: '50', label: '50' },
                      ]}
                    />
                    <SelectRow
                      label="Auto-mark as read"
                      description="Delay after opening a message"
                      value={String(settings.auto_mark_read_seconds)}
                      onChange={(v) => save({ auto_mark_read_seconds: parseInt(v) })}
                      options={[
                        { value: '0',  label: 'Immediately' },
                        { value: '2',  label: '2 seconds' },
                        { value: '5',  label: '5 seconds' },
                        { value: '10', label: '10 seconds' },
                      ]}
                    />
                    <ToggleRow
                      label="Send and archive"
                      description="Auto-archive threads after you reply"
                      checked={settings.send_and_archive}
                      onChange={(v) => save({ send_and_archive: v })}
                    />
                  </Card>
                )}

                {active === 'signature' && (
                  <Card title="Signature" description="Appended to the bottom of new messages">
                    <div className="px-5 py-4">
                      <textarea
                        value={settings.signature || ''}
                        onChange={(e) => save({ signature: e.target.value })}
                        rows={6}
                        placeholder={'e.g.\nBest regards,\nYour Name\nFounder at Your Venture'}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-3 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.18] resize-none leading-relaxed"
                      />
                    </div>
                    <ToggleRow
                      label="Include on replies"
                      description="Add signature when replying to messages"
                      checked={settings.use_signature_on_reply}
                      onChange={(v) => save({ use_signature_on_reply: v })}
                    />
                  </Card>
                )}

                {active === 'vacation' && (
                  <Card title="Vacation responder" description="Auto-reply while you are away">
                    <ToggleRow
                      label="Enable vacation responder"
                      description="Automatically reply to incoming messages"
                      checked={settings.vacation_enabled}
                      onChange={(v) => save({ vacation_enabled: v })}
                    />
                    {settings.vacation_enabled && (
                      <div className="px-5 pb-5 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <LabeledInput
                            label="Start date"
                            type="date"
                            value={settings.vacation_start_date?.slice(0, 10) || ''}
                            onChange={(v) => save({ vacation_start_date: v ? new Date(v).toISOString() : null })}
                          />
                          <LabeledInput
                            label="End date"
                            type="date"
                            value={settings.vacation_end_date?.slice(0, 10) || ''}
                            onChange={(v) => save({ vacation_end_date: v ? new Date(v).toISOString() : null })}
                          />
                        </div>
                        <LabeledInput
                          label="Subject"
                          type="text"
                          placeholder="Out of office"
                          value={settings.vacation_subject || ''}
                          onChange={(v) => save({ vacation_subject: v })}
                        />
                        <div>
                          <label className="block text-[10.5px] font-bold text-white/50 uppercase tracking-wider mb-1.5">Message</label>
                          <textarea
                            value={settings.vacation_message || ''}
                            onChange={(e) => save({ vacation_message: e.target.value })}
                            rows={4}
                            placeholder="I am currently away and will respond when I return..."
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.18] resize-none leading-relaxed"
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                {active === 'shortcuts' && (
                  <Card title="Keyboard shortcuts" description="Move through mail faster">
                    <ToggleRow
                      label="Enable shortcuts"
                      description="Use single-key navigation and actions"
                      checked={settings.keyboard_shortcuts_enabled}
                      onChange={(v) => save({ keyboard_shortcuts_enabled: v })}
                    />
                    <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-[12.5px] text-white/70">
                      <ShortcutRow keys={['C']} label="Compose" />
                      <ShortcutRow keys={['/']} label="Search" />
                      <ShortcutRow keys={['E']} label="Archive" />
                      <ShortcutRow keys={['#']} label="Move to trash" />
                      <ShortcutRow keys={['R']} label="Reply" />
                      <ShortcutRow keys={['A']} label="Reply all" />
                      <ShortcutRow keys={['F']} label="Forward" />
                      <ShortcutRow keys={['⌘', 'K']} label="Command palette" />
                    </div>
                  </Card>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

/* ---------- Local UI helpers (theme-consistent) ---------- */

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl overflow-hidden border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.015]">
      <header className="px-5 py-4 border-b border-white/[0.06]">
        <h3 className="text-[14px] font-bold text-white">{title}</h3>
        {description && <p className="text-[11.5px] text-white/50 mt-0.5">{description}</p>}
      </header>
      <div className="divide-y divide-white/[0.05]">{children}</div>
    </section>
  )
}

function ToggleRow({
  label, description, checked, onChange,
}: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3.5">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-white">{label}</p>
        <p className="text-[11.5px] text-white/50 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className={cn(
          'relative shrink-0 w-10 h-[22px] rounded-full transition-colors mt-0.5 border',
          checked ? 'bg-white border-white' : 'bg-white/[0.08] border-white/[0.12]'
        )}
      >
        <span
          className={cn(
            'absolute top-[2px] w-[16px] h-[16px] rounded-full transition-all',
            checked ? 'left-[20px] bg-black' : 'left-[2px] bg-white'
          )}
        />
      </button>
    </div>
  )
}

function SelectRow({
  label, description, value, onChange, options,
}: {
  label: string; description?: string; value: string; onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-white">{label}</p>
        {description && <p className="text-[11.5px] text-white/50 mt-0.5">{description}</p>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 pl-3 pr-8 rounded-md border border-white/[0.1] bg-white/[0.04] text-white text-[12.5px] font-medium cursor-pointer focus:outline-none appearance-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function LabeledInput({
  label, type = 'text', value, onChange, placeholder,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[10.5px] font-bold text-white/50 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 rounded-md bg-white/[0.04] border border-white/[0.08] text-[12.5px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.18]"
      />
    </div>
  )
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span>{label}</span>
      <span className="inline-flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd
            key={i}
            className="min-w-[22px] h-6 px-1.5 inline-flex items-center justify-center rounded border border-white/[0.1] bg-white/[0.04] text-[10.5px] font-bold text-white/80"
          >
            {k}
          </kbd>
        ))}
      </span>
    </div>
  )
}

function SkeletonCard() {
  return <div className="h-52 rounded-xl border border-white/[0.06] bg-white/[0.02] animate-pulse" />
}