'use client'

import { useState } from 'react'
import { Gear, Warning, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Props {
  venture: any
  slug: string
  onUpdate: (patch: any) => Promise<void>
}

export function VentureSettings({ venture, slug, onUpdate }: Props) {
  const [settings, setSettings] = useState({
    show_in_explore: venture.show_in_explore,
    is_building_public: venture.is_building_public,
    seeking_investment: venture.seeking_investment,
    seeking_cofounder: venture.seeking_cofounder,
    seeking_advisor: venture.seeking_advisor,
    seeking_partner: venture.seeking_partner,
    is_hiring: venture.is_hiring,
  })

  const save = async () => {
    await onUpdate(settings)
    toast.success('Settings updated')
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-bold text-white flex items-center gap-2">
            <Gear size={15} weight="fill" className="text-purple-300" />
            Venture Settings
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <ToggleRow label="Show in Explore" desc="Make your venture discoverable by other builders" checked={settings.show_in_explore} onChange={(v) => setSettings({ ...settings, show_in_explore: v })} />
          <ToggleRow label="Building in Public" desc="Show a 'Building in Public' badge on your venture" checked={settings.is_building_public} onChange={(v) => setSettings({ ...settings, is_building_public: v })} />
          <ToggleRow label="Seeking Investment" desc="Signal that you're raising a round" checked={settings.seeking_investment} onChange={(v) => setSettings({ ...settings, seeking_investment: v })} />
          <ToggleRow label="Seeking Co-founder" desc="Signal that you're looking for a co-founder" checked={settings.seeking_cofounder} onChange={(v) => setSettings({ ...settings, seeking_cofounder: v })} />
          <ToggleRow label="Seeking Advisor" desc="Signal that you're looking for advisors" checked={settings.seeking_advisor} onChange={(v) => setSettings({ ...settings, seeking_advisor: v })} />
          <ToggleRow label="Seeking Partners" desc="Signal that you're open to partnerships" checked={settings.seeking_partner} onChange={(v) => setSettings({ ...settings, seeking_partner: v })} />
          <ToggleRow label="Hiring" desc="Show a Hiring badge on your venture" checked={settings.is_hiring} onChange={(v) => setSettings({ ...settings, is_hiring: v })} />

          <div className="pt-3 border-t border-white/[0.06]">
            <button onClick={save} className="text-[13px] font-semibold text-black bg-white hover:bg-white/90 px-4 h-9 rounded-lg">
              Save Settings
            </button>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-red-500/[0.05] border border-red-500/20 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-red-500/20">
          <h2 className="text-[15px] font-bold text-red-300 flex items-center gap-2">
            <Warning size={15} weight="fill" />
            Danger Zone
          </h2>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold text-white">Archive Venture</p>
              <p className="text-[11.5px] text-white/60 mt-0.5">This will hide your venture from all listings. You can restore it later.</p>
            </div>
            <button className="text-[12px] font-semibold text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-3 h-8 rounded-lg flex items-center gap-1.5 flex-shrink-0">
              <Trash size={11} weight="fill" /> Archive
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <div className="flex-1">
        <p className="text-[13px] font-semibold text-white">{label}</p>
        <p className="text-[11.5px] text-white/50 mt-0.5">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={
          'relative w-10 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ' +
          (checked ? 'bg-purple-500' : 'bg-white/[0.08]')
        }
      >
        <span className={
          'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ' +
          (checked ? 'translate-x-4' : 'translate-x-0.5')
        } />
      </button>
    </label>
  )
}
