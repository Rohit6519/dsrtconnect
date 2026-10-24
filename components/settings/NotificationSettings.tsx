'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell } from 'lucide-react'
import { DsrtPanel, DsrtButton } from '@/components/dsrt'
import { cn } from '@/lib/utils'

interface NotificationSettingsProps {
  profile: any
}

const NOTIFICATION_TYPES = [
  { key: 'post_like', label: 'Post likes', desc: 'When someone likes your post' },
  { key: 'post_comment', label: 'Comments', desc: 'When someone comments on your post' },
  { key: 'follow', label: 'New followers', desc: 'When someone follows you' },
  { key: 'project_join', label: 'Project joins', desc: 'When someone joins your project' },
  { key: 'message', label: 'Direct messages', desc: 'When you receive a message' },
  { key: 'mentor_reply', label: 'Mentor replies', desc: 'When DSRT Mentor responds' },
]

export function NotificationSettings({ profile }: NotificationSettingsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    profile.notif_prefs || {
      post_like: true,
      post_comment: true,
      follow: true,
      project_join: true,
      message: true,
      mentor_reply: true,
    }
  )
  const [saving, setSaving] = useState(false)

  const toggle = (key: string) => {
    setPrefs({ ...prefs, [key]: !prefs[key] })
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase
      .from('users')
      .update({ notif_prefs: prefs })
      .eq('id', profile.id)
    setSaving(false)
    router.refresh()
  }

  return (
    <DsrtPanel padding="md" className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#1e3a5f]/40 border border-[#2c5282]/40 text-[#93c5fd] flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-[14px] font-bold text-white">Notifications</h2>
          <p className="text-[11px] font-mono uppercase tracking-wider text-white/40 mt-0.5">
            Choose what you want to be notified about
          </p>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        {NOTIFICATION_TYPES.map((t) => (
          <div
            key={t.key}
            className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]"
          >
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-[13px] font-semibold text-white">{t.label}</p>
              <p className="text-[11px] text-white/45">{t.desc}</p>
            </div>
            <ToggleSwitch checked={prefs[t.key] ?? true} onToggle={() => toggle(t.key)} />
          </div>
        ))}
      </div>

      <DsrtButton onClick={handleSave} loading={saving} variant="primary" fullWidth>
        Save Preferences
      </DsrtButton>
    </DsrtPanel>
  )
}

function ToggleSwitch({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only peer" />
      <div className={cn(
        "w-10 h-5 rounded-full peer transition-colors relative border",
        checked
          ? "bg-gradient-to-b from-[#1e3a5f] to-[#2c5282] border-[#2c5282]/50"
          : "bg-white/[0.06] border-white/[0.1]"
      )}>
        <div className={cn(
          "absolute top-[2px] left-[2px] bg-white rounded-full h-4 w-4 transition-all shadow-md",
          checked && "translate-x-5"
        )} />
      </div>
    </label>
  )
}