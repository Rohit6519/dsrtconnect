import { ShieldCheck, Eye, EyeOff, Lock, Users } from 'lucide-react'
import { DsrtPage, DsrtSection, DsrtPanel } from '@/components/dsrt'

export default function PrivacyPage() {
  return (
    <DsrtPage width="narrow" className="space-y-6 py-6 sm:py-8">
      <DsrtSection
        title="Privacy Manifesto"
        description="How DSRT handles your data across integrations and platform activity."
        headerVariant="large"
      />

      <DsrtPanel variant="accent" padding="lg">
        <ShieldCheck className="w-8 h-8 text-white mb-3" strokeWidth={1.75} />
        <h2 className="text-[16px] sm:text-[17px] font-bold text-white mb-2">Our Frontier Policy</h2>
        <p className="text-[13px] sm:text-[14px] text-white/80 leading-relaxed">
          DSRT operates on a principle of <strong className="text-white">behavioral analysis, not content mining</strong>.
          We look at how you build, when you ship, and what patterns emerge — never at the substance of your work itself.
        </p>
      </DsrtPanel>

      <div className="space-y-4">
        <DsrtPanel padding="md">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <Eye className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <h3 className="text-[14px] sm:text-[15px] font-bold text-white">What we DO access</h3>
          </div>
          <ul className="space-y-2 text-[13px] text-white/70 leading-relaxed">
            <li className="flex gap-2"><span className="text-white/30">·</span> Metadata: commit counts, post frequencies, engagement metrics</li>
            <li className="flex gap-2"><span className="text-white/30">·</span> Patterns: when you work, how often you ship, streak data</li>
            <li className="flex gap-2"><span className="text-white/30">·</span> Public info: profile bios, work history, skills endorsements</li>
            <li className="flex gap-2"><span className="text-white/30">·</span> Aggregated stats: total stars, followers, published content</li>
          </ul>
        </DsrtPanel>

        <DsrtPanel padding="md">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 flex items-center justify-center">
              <EyeOff className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <h3 className="text-[14px] sm:text-[15px] font-bold text-white">What we NEVER access</h3>
          </div>
          <ul className="space-y-2 text-[13px] text-white/70 leading-relaxed">
            <li className="flex gap-2"><span className="text-white/30">·</span> Your actual code (GitHub file contents)</li>
            <li className="flex gap-2"><span className="text-white/30">·</span> Private messages (DMs on any platform)</li>
            <li className="flex gap-2"><span className="text-white/30">·</span> Draft content that hasn't been published</li>
            <li className="flex gap-2"><span className="text-white/30">·</span> Full connection lists or contact books</li>
            <li className="flex gap-2"><span className="text-white/30">·</span> Financial or sensitive personal information</li>
          </ul>
        </DsrtPanel>

        <DsrtPanel padding="md">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/40 border border-[#2c5282]/40 text-[#93c5fd] flex items-center justify-center">
              <Lock className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <h3 className="text-[14px] sm:text-[15px] font-bold text-white">Your Data Controls</h3>
          </div>
          <ul className="space-y-2 text-[13px] text-white/70 leading-relaxed">
            <li className="flex gap-2"><span className="text-white/30">·</span> Disconnect any integration at any time</li>
            <li className="flex gap-2"><span className="text-white/30">·</span> Export all your data in machine-readable format</li>
            <li className="flex gap-2"><span className="text-white/30">·</span> Delete your account and all associated data permanently</li>
            <li className="flex gap-2"><span className="text-white/30">·</span> Choose which repositories, accounts, or feeds to sync</li>
            <li className="flex gap-2"><span className="text-white/30">·</span> View access logs of every data pull</li>
          </ul>
        </DsrtPanel>

        <DsrtPanel padding="md">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/70 flex items-center justify-center">
              <Users className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <h3 className="text-[14px] sm:text-[15px] font-bold text-white">Universal Access</h3>
          </div>
          <p className="text-[13px] text-white/70 leading-relaxed mb-3">
            DSRT is not just for developers. Integrations serve every domain:
          </p>
          <ul className="space-y-1.5 text-[13px] text-white/70 leading-relaxed">
            <li><strong className="text-white">Developers</strong> — GitHub for code contributions</li>
            <li><strong className="text-white">Designers</strong> — Behance, Dribbble for portfolios</li>
            <li><strong className="text-white">Creators</strong> — YouTube, Instagram for content</li>
            <li><strong className="text-white">Musicians</strong> — Spotify for releases</li>
            <li><strong className="text-white">Founders</strong> — ProductHunt for launches</li>
            <li><strong className="text-white">All Professionals</strong> — LinkedIn for career</li>
          </ul>
        </DsrtPanel>
      </div>

      <p className="text-[11px] font-mono uppercase tracking-wider text-white/30 pt-6 border-t border-white/[0.06]">
        Last updated: {new Date().toLocaleDateString()} · Questions? privacy@dsrt.app
      </p>
    </DsrtPage>
  )
}