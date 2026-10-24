'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DollarSign } from 'lucide-react'
import { SectorSelector } from '@/components/shared/SectorSelector'
import { DsrtPanel, DsrtButton } from '@/components/dsrt'
import { cn } from '@/lib/utils'

interface InvestorSettingsProps {
  profile: any
}

export function InvestorSettings({ profile }: InvestorSettingsProps) {
  const router = useRouter()
  const supabase = createClient()

  const [isInvestor, setIsInvestor] = useState(profile.is_investor || false)
  const [investorType, setInvestorType] = useState(profile.investor_type || '')
  const [checkSize, setCheckSize] = useState(profile.check_size || '')
  const [focusSectors, setFocusSectors] = useState<string[]>(profile.focus_sectors || [])
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await supabase
      .from('users')
      .update({
        is_investor: isInvestor,
        investor_type: isInvestor ? investorType : null,
        check_size: isInvestor ? checkSize : null,
        focus_sectors: isInvestor ? focusSectors : [],
      })
      .eq('id', profile.id)
    setSaving(false)
    router.refresh()
    if (isInvestor) router.push('/investor')
  }

  return (
    <DsrtPanel padding="md" className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#1e3a5f]/40 border border-[#2c5282]/40 text-[#93c5fd] flex items-center justify-center shrink-0">
          <DollarSign className="w-4 h-4" strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[14px] font-bold text-white">Investor Profile</h2>
          <p className="text-[11px] font-mono uppercase tracking-wider text-white/40 mt-0.5">
            Enable if you invest in startups
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input type="checkbox" checked={isInvestor} onChange={(e) => setIsInvestor(e.target.checked)} className="sr-only peer" />
          <div className={cn(
            "w-10 h-5 rounded-full peer transition-colors relative border",
            isInvestor
              ? "bg-gradient-to-b from-[#1e3a5f] to-[#2c5282] border-[#2c5282]/50"
              : "bg-white/[0.06] border-white/[0.1]"
          )}>
            <div className={cn(
              "absolute top-[2px] left-[2px] bg-white rounded-full h-4 w-4 transition-all shadow-md",
              isInvestor && "translate-x-5"
            )} />
          </div>
        </label>
      </div>

      {isInvestor && (
        <div className="space-y-5 pt-4 border-t border-white/[0.06]">
          <div className="space-y-2">
            <label className="text-[11px] font-mono uppercase tracking-wider text-white/50">Investor Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['Angel', 'VC Firm', 'Accelerator', 'Family Office'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setInvestorType(t)}
                  className={cn(
                    'p-2.5 text-[12px] font-semibold rounded-lg border transition-all',
                    investorType === t
                      ? 'border-[#2c5282] bg-[#1e3a5f]/40 text-white'
                      : 'border-white/[0.08] bg-white/[0.02] text-white/60 hover:text-white hover:border-white/[0.16]'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-mono uppercase tracking-wider text-white/50">Typical Check Size</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['< $25k', '$25k - $100k', '$100k - $500k', '$500k+'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setCheckSize(s)}
                  className={cn(
                    'p-2.5 text-[12px] font-semibold rounded-lg border transition-all',
                    checkSize === s
                      ? 'border-[#2c5282] bg-[#1e3a5f]/40 text-white'
                      : 'border-white/[0.08] bg-white/[0.02] text-white/60 hover:text-white hover:border-white/[0.16]'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-mono uppercase tracking-wider text-white/50">Focus Sectors</label>
            <SectorSelector selected={focusSectors} onChange={setFocusSectors} max={8} />
          </div>
        </div>
      )}

      <DsrtButton onClick={handleSave} loading={saving} variant="primary" fullWidth>
        Save Changes
      </DsrtButton>
    </DsrtPanel>
  )
}