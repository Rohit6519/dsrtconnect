import Link from 'next/link'
import { User, Bell, Shield, CreditCard, Puzzle, FileLock } from 'lucide-react'
import { DsrtPage, DsrtSection, DsrtPanel, DsrtChip } from '@/components/dsrt'

const sections = [
  { icon: User, name: 'Profile', href: '/settings/profile', desc: 'Your identity and public info' },
  { icon: Puzzle, name: 'Integrations', href: '/settings/integrations', desc: 'GitHub, LinkedIn, Twitter, and more' },
  { icon: Shield, name: 'Security & Privacy', href: '/settings/security', desc: 'Password, 2FA, encryption, data export', highlight: true },
  { icon: FileLock, name: 'Encrypted Vault', href: '/vault', desc: 'End-to-end encrypted personal notes' },
  { icon: Bell, name: 'Notifications', href: '/settings/notifications', desc: 'How you get alerted' },
  { icon: CreditCard, name: 'Billing', href: '/settings/billing', desc: 'Plan and payment' },
]

export default function SettingsPage() {
  return (
    <DsrtPage width="narrow" className="space-y-6 py-6 sm:py-8">
      <DsrtSection
        title="Settings"
        description="Manage your DSRT account, integrations, and preferences."
        headerVariant="large"
      />

      <div className="space-y-2.5">
        {sections.map(section => {
          const Icon = section.icon
          return (
            <Link
              key={section.href}
              href={section.href}
              className="block group"
            >
              <DsrtPanel padding="md" className="hover:border-white/[0.14] transition-all group-hover:-translate-y-0.5">
                <div className="flex items-center gap-4">
                  <div className={
                    'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ' +
                    (section.highlight
                      ? 'bg-gradient-to-br from-[#1e3a5f] to-[#0f172a] border-[#2c5282]/40 text-[#93c5fd]'
                      : 'bg-white/[0.04] border-white/[0.08] text-white/60')
                  }>
                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[14px] sm:text-[15px] font-bold text-white">{section.name}</p>
                      {section.highlight && (
                        <DsrtChip size="sm" tone="accent">NEW</DsrtChip>
                      )}
                    </div>
                    <p className="text-[12px] sm:text-[13px] text-white/50 mt-0.5 leading-relaxed">
                      {section.desc}
                    </p>
                  </div>
                </div>
              </DsrtPanel>
            </Link>
          )
        })}
      </div>
    </DsrtPage>
  )
}