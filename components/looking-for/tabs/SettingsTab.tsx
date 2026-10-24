'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Gear, Warning, CheckCircle, FloppyDisk,
} from '@phosphor-icons/react'
import { EmptyState } from '../EmptyState'
import { REQUEST_TYPE_LABELS, COMMITMENT_LABELS, WORK_MODE_LABELS } from '@/types/teamup'

interface Settings {
  user_id: string
  interested_in: string[]
  preferred_commitment: string[]
  preferred_work_mode: string[]
  preferred_industries: string[]
  preferred_locations: string[]
  min_experience_level: string | null
  notify_new_matches: boolean
  notify_invitations: boolean
  notify_application_updates: boolean
  notify_deadlines: boolean
  digest_frequency: string
  show_in_suggestions: boolean
  allow_invitations: boolean
  hide_from_users: string[]
}

const EXPERIENCE_OPTIONS = [
  { key: '',            label: 'Any' },
  { key: 'student',     label: 'Student' },
  { key: 'beginner',    label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced',    label: 'Advanced' },
  { key: 'expert',      label: 'Expert' },
  { key: 'founder',     label: 'Founder' },
  { key: 'professional', label: 'Professional' },
]

const DIGEST_OPTIONS = [
  { key: 'daily',  label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'never',  label: 'Never' },
]

export function SettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [industryInput, setIndustryInput] = useState('')
  const [locationInput, setLocationInput] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/looking-for/settings')
      if (!res.ok) throw new Error('Failed to load settings')
      const data = await res.json()
      setSettings(data.settings)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async (patch: Partial<Settings>) => {
    if (!settings) return
    const merged = { ...settings, ...patch }
    setSettings(merged)
    setSaving(true)
    try {
      await fetch('/api/looking-for/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      setSavedAt(new Date())
      setTimeout(() => setSavedAt(null), 2200)
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  const toggle = (field: keyof Settings, value: string) => {
    if (!settings) return
    const arr = (settings[field] as string[]) || []
    const next = arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value]
    save({ [field]: next } as any)
  }

  const addTo = (field: 'preferred_industries' | 'preferred_locations', value: string) => {
    if (!settings || !value.trim()) return
    const arr = settings[field] || []
    if (arr.includes(value.trim())) return
    save({ [field]: [...arr, value.trim()] })
  }

  const removeFrom = (field: 'preferred_industries' | 'preferred_locations', value: string) => {
    if (!settings) return
    save({ [field]: (settings[field] || []).filter((x: string) => x !== value) })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-40 rounded-xl border border-zinc-800/80 bg-zinc-950/40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={<Warning size={20} weight="regular" />}
        title="Couldn't load settings"
        description={error}
      />
    )
  }

  if (!settings) return null

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Save indicator */}
      {(saving || savedAt) && (
        <div className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-[12px] text-zinc-300 shadow-lg">
          {saving ? (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-zinc-500/30 border-t-zinc-300 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle size={12} weight="fill" className="text-emerald-400" />
              Saved
            </>
          )}
        </div>
      )}

      {/* Discovery */}
      <SettingsSection
        title="Discovery preferences"
        description="Help us surface opportunities that match what you're looking for."
      >
        <Field label="I'm interested in">
          <ChipGrid>
            {Object.entries(REQUEST_TYPE_LABELS).map(([key, label]) => (
              <Chip
                key={key}
                active={settings.interested_in.includes(key)}
                onClick={() => toggle('interested_in', key)}
              >
                {label}
              </Chip>
            ))}
          </ChipGrid>
        </Field>

        <Field label="Preferred commitment">
          <ChipGrid>
            {Object.entries(COMMITMENT_LABELS).map(([key, label]) => (
              <Chip
                key={key}
                active={settings.preferred_commitment.includes(key)}
                onClick={() => toggle('preferred_commitment', key)}
              >
                {label}
              </Chip>
            ))}
          </ChipGrid>
        </Field>

        <Field label="Preferred work mode">
          <ChipGrid>
            {Object.entries(WORK_MODE_LABELS).map(([key, label]) => (
              <Chip
                key={key}
                active={settings.preferred_work_mode.includes(key)}
                onClick={() => toggle('preferred_work_mode', key)}
              >
                {label}
              </Chip>
            ))}
          </ChipGrid>
        </Field>

        <Field label="Minimum experience level">
          <select
            value={settings.min_experience_level || ''}
            onChange={(e) => save({ min_experience_level: e.target.value || null })}
            className="h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-700 cursor-pointer"
          >
            {EXPERIENCE_OPTIONS.map(o => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Industries you care about">
          <TagInput
            items={settings.preferred_industries}
            input={industryInput}
            onInput={setIndustryInput}
            onAdd={(v) => { addTo('preferred_industries', v); setIndustryInput('') }}
            onRemove={(v) => removeFrom('preferred_industries', v)}
            placeholder="e.g. AI, Fintech, Healthcare — press Enter"
          />
        </Field>

        <Field label="Preferred locations">
          <TagInput
            items={settings.preferred_locations}
            input={locationInput}
            onInput={setLocationInput}
            onAdd={(v) => { addTo('preferred_locations', v); setLocationInput('') }}
            onRemove={(v) => removeFrom('preferred_locations', v)}
            placeholder="e.g. Remote, San Francisco, EU"
          />
        </Field>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection
        title="Notifications"
        description="Choose what team-up activity you want to hear about."
      >
        <ToggleRow
          label="New matches"
          description="When we find an opportunity that fits your profile."
          checked={settings.notify_new_matches}
          onChange={(v) => save({ notify_new_matches: v })}
        />
        <ToggleRow
          label="Invitations received"
          description="When someone invites you to collaborate."
          checked={settings.notify_invitations}
          onChange={(v) => save({ notify_invitations: v })}
        />
        <ToggleRow
          label="Application status updates"
          description="When an application you submitted moves to a new stage."
          checked={settings.notify_application_updates}
          onChange={(v) => save({ notify_application_updates: v })}
        />
        <ToggleRow
          label="Deadline reminders"
          description="When a saved opportunity is closing soon."
          checked={settings.notify_deadlines}
          onChange={(v) => save({ notify_deadlines: v })}
        />

        <Field label="Digest frequency">
          <ChipGrid>
            {DIGEST_OPTIONS.map(o => (
              <Chip
                key={o.key}
                active={settings.digest_frequency === o.key}
                onClick={() => save({ digest_frequency: o.key })}
              >
                {o.label}
              </Chip>
            ))}
          </ChipGrid>
        </Field>
      </SettingsSection>

      {/* Privacy */}
      <SettingsSection
        title="Privacy"
        description="Control how others discover you through Team Up."
      >
        <ToggleRow
          label="Show me in suggestions"
          description="Allow request owners to see you in their 'Suggested people' lists."
          checked={settings.show_in_suggestions}
          onChange={(v) => save({ show_in_suggestions: v })}
        />
        <ToggleRow
          label="Allow invitations"
          description="Let request owners invite you to collaborate on their opportunities."
          checked={settings.allow_invitations}
          onChange={(v) => save({ allow_invitations: v })}
        />
      </SettingsSection>
    </div>
  )
}

function SettingsSection({
  title, description, children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-6">
      <div className="mb-5">
        <h3 className="text-[15px] font-semibold text-white">{title}</h3>
        {description && (
          <p className="text-[12.5px] text-zinc-500 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-2">
        {label}
      </label>
      {children}
    </div>
  )
}

function ChipGrid({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>
}

function Chip({
  children, active, onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'inline-flex items-center h-7 px-2.5 rounded text-[11.5px] font-medium border transition-colors ' +
        (active
          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
          : 'bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700')
      }
    >
      {children}
    </button>
  )
}

function ToggleRow({
  label, description, checked, onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-1 cursor-pointer">
      <div>
        <div className="text-[13px] font-medium text-zinc-200">{label}</div>
        {description && (
          <div className="text-[12px] text-zinc-500 mt-0.5 leading-relaxed">{description}</div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={
          'relative shrink-0 w-9 h-5 rounded-full transition-colors ' +
          (checked ? 'bg-blue-600' : 'bg-zinc-800')
        }
        role="switch"
        aria-checked={checked}
      >
        <span className={
          'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ' +
          (checked ? 'translate-x-4' : 'translate-x-0')
        } />
      </button>
    </label>
  )
}

function TagInput({
  items, input, onInput, onAdd, onRemove, placeholder,
}: {
  items: string[]
  input: string
  onInput: (v: string) => void
  onAdd: (v: string) => void
  onRemove: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <input
        type="text"
        value={input}
        onChange={(e) => onInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (input.trim()) onAdd(input.trim())
          }
        }}
        placeholder={placeholder}
        className="w-full h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 mb-2"
      />
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map(item => (
            <span
              key={item}
              className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded bg-zinc-900 border border-zinc-800 text-[11.5px] text-zinc-200"
            >
              {item}
              <button
                type="button"
                onClick={() => onRemove(item)}
                className="w-4 h-4 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
              >
                <span className="text-[12px] leading-none">×</span>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
