'use client'

import { Info, Globe, Lock, Users, Link as LinkIcon, Shield, Warning } from '@phosphor-icons/react'

interface Props {
  draft: any
  onUpdate: (patch: any) => void
}

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', description: 'Anyone on DSRT can find and view this opportunity.', Icon: Globe },
  { value: 'members', label: 'DSRT Members only', description: 'Only signed-in DSRT members can find this opportunity.', Icon: Users },
  { value: 'private-link', label: 'Private link', description: 'Only people with the direct link can view it. Not shown in search or feeds.', Icon: LinkIcon },
  { value: 'invite-only', label: 'Invite only', description: 'Only people you specifically invite can view and apply.', Icon: Lock },
]

export function AdvancedSettingsPanel({ draft, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold text-white leading-tight">Advanced Settings</h1>
        <p className="text-[13px] text-zinc-400 mt-1.5">
          Control visibility, applications, and privacy for this opportunity.
        </p>
      </div>

      {/* Visibility */}
      <SettingsSection
        title="Visibility"
        description="Choose who can discover and view this opportunity."
      >
        <div className="space-y-2">
          {VISIBILITY_OPTIONS.map(opt => {
            const isActive = draft?.visibility === opt.value
            return (
              <label
                key={opt.value}
                className={
                  'flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ' +
                  (isActive
                    ? 'border-blue-500/40 bg-blue-500/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/30')
                }
              >
                <input
                  type="radio"
                  name="visibility"
                  value={opt.value}
                  checked={isActive}
                  onChange={(e) => onUpdate({ visibility: e.target.value })}
                  className="mt-1 w-3.5 h-3.5 accent-blue-500 cursor-pointer shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <opt.Icon size={12} weight="regular" className={isActive ? 'text-blue-400' : 'text-zinc-500'} />
                    <span className={
                      'text-[13px] font-semibold ' +
                      (isActive ? 'text-white' : 'text-zinc-200')
                    }>
                      {opt.label}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-zinc-500 mt-1 leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </label>
            )
          })}
        </div>
      </SettingsSection>

      {/* Applications */}
      <SettingsSection
        title="Applications"
        description="Control how people can apply."
      >
        <div className="divide-y divide-zinc-800/60">
          <ToggleRow
            label="Accept applications"
            description="Turn off to stop receiving new applications without closing the opportunity."
            checked={draft?.applications_open !== false}
            onChange={(v) => onUpdate({ applications_open: v })}
          />
          <ToggleRow
            label="Allow withdrawal"
            description="Let applicants withdraw their application after submitting."
            checked={draft?.allow_withdrawal !== false}
            onChange={(v) => onUpdate({ allow_withdrawal: v })}
          />
          <ToggleRow
            label="Auto-close after deadline"
            description="Automatically stop accepting applications after the deadline passes."
            checked={draft?.auto_close_after_deadline !== false}
            onChange={(v) => onUpdate({ auto_close_after_deadline: v })}
          />
        </div>

        <div className="mt-5 pt-5 border-t border-zinc-800">
          <FieldLabel>Maximum applications</FieldLabel>
          <FieldHelp>Leave empty for no limit. Applications will auto-close once this number is reached.</FieldHelp>
          <input
            type="number"
            min={1}
            value={draft?.max_applications || ''}
            onChange={(e) => onUpdate({ max_applications: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="No limit"
            className="mt-2 w-full max-w-xs h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
          />
        </div>
      </SettingsSection>

      {/* Privacy */}
      <SettingsSection
        title="Privacy"
        description="Control what information is displayed publicly."
      >
        <div className="divide-y divide-zinc-800/60">
          <ToggleRow
            label="Show applicant count"
            description="Display how many people have applied to help build social proof."
            checked={draft?.show_applicant_count !== false}
            onChange={(v) => onUpdate({ show_applicant_count: v })}
          />
          <ToggleRow
            label="Show poster identity"
            description="Display who posted this opportunity. Turning off makes the opportunity anonymous."
            checked={draft?.show_poster_identity !== false}
            onChange={(v) => onUpdate({ show_poster_identity: v })}
          />
          <ToggleRow
            label="Show compensation"
            description="Display compensation range publicly."
            checked={draft?.show_compensation !== false}
            onChange={(v) => onUpdate({ show_compensation: v })}
          />
          <ToggleRow
            label="Show location"
            description="Display location information publicly."
            checked={draft?.show_location !== false}
            onChange={(v) => onUpdate({ show_location: v })}
          />
        </div>
      </SettingsSection>

      {/* Priority / Urgency */}
      <SettingsSection
        title="Priority"
        description="Signal how urgent this opportunity is."
      >
        <FieldLabel>Urgency level</FieldLabel>
        <select
          value={draft?.urgency || 'normal'}
          onChange={(e) => onUpdate({ urgency: e.target.value })}
          className="mt-2 w-full max-w-md h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 focus:outline-none focus:border-zinc-700 cursor-pointer"
        >
          <option value="low">Low — no rush</option>
          <option value="normal">Normal</option>
          <option value="high">High — filling soon</option>
          <option value="urgent">Urgent — need help ASAP</option>
        </select>
        <FieldHelp className="mt-2">
          Higher urgency signals may boost visibility in search and recommendations.
        </FieldHelp>
      </SettingsSection>

      {/* Info footer */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 flex items-start gap-3">
        <Info size={14} weight="regular" className="text-zinc-500 shrink-0 mt-0.5" />
        <p className="text-[12px] text-zinc-400 leading-relaxed">
          Changes to these settings are saved automatically. Publishing this opportunity will apply all settings.
        </p>
      </div>
    </div>
  )
}

// ─── Sub-components ───

function SettingsSection({
  title, description, children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className={
      'rounded-xl border border-zinc-800 bg-zinc-950/30 overflow-hidden ' +
      'shadow-[0_2px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)]'
    }>
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/40">
        <h2 className="text-[14.5px] font-bold text-white">{title}</h2>
        {description && (
          <p className="text-[12px] text-zinc-400 mt-1">{description}</p>
        )}
      </div>
      <div className="p-6">
        {children}
      </div>
    </section>
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
    <div className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-zinc-100">{label}</div>
        {description && (
          <p className="text-[11.5px] text-zinc-500 mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className={
          'shrink-0 mt-0.5 w-10 h-6 rounded-full transition-colors relative ' +
          'shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] ' +
          (checked
            ? 'bg-blue-500'
            : 'bg-zinc-800')
        }
      >
        <span
          className={
            'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ' +
            'shadow-[0_2px_4px_rgba(0,0,0,0.3),0_0_0_1px_rgba(0,0,0,0.05)] ' +
            (checked ? 'translate-x-4' : 'translate-x-0.5')
          }
        />
      </button>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[12px] font-semibold text-zinc-200">
      {children}
    </label>
  )
}

function FieldHelp({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={'text-[11.5px] text-zinc-500 leading-relaxed ' + className}>
      {children}
    </p>
  )
}