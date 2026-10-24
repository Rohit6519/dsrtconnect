'use client'

import { useState } from 'react'
import { Gift, Copy, Check, Share2, Users } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { DsrtPanel, DsrtButton, DsrtSection, DsrtInput, DsrtAvatar, DsrtEmpty } from '@/components/dsrt'

interface ReferralViewProps {
  code: any
  referrals: any[]
}

export function ReferralView({ code, referrals }: ReferralViewProps) {
  const [copied, setCopied] = useState(false)

  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${code?.code}`

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on DSRT',
          text: 'DSRT is the professional builder ecosystem for founders, engineers, and designers.',
          url: referralLink,
        })
      } catch {}
    } else {
      copyLink()
    }
  }

  return (
    <div className="space-y-6">
      <DsrtPanel variant="accent" padding="lg">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-[24px] sm:text-[28px] font-bold text-white tracking-tight leading-tight">Invite Builders</h1>
            <p className="text-[14px] text-white/80 mt-1 max-w-lg leading-relaxed">
              Every builder you invite makes the DSRT ecosystem stronger. Share your invite
              link and grow the network.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-4 max-w-xl">
          <div className="bg-[#05070D]/40 border border-white/10 rounded-xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-wider text-white/50 font-bold mb-2">
              Your invite code
            </p>
            <p className="text-[28px] font-bold font-mono tracking-widest text-white">
              {code?.code || 'LOADING'}
            </p>
          </div>

          <div className="bg-[#05070D]/40 border border-white/10 rounded-xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-wider text-white/50 font-bold mb-2">
              Invite link
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1">
                <DsrtInput value={referralLink} readOnly sizeVariant="lg" />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <DsrtButton size="md" variant="white" onClick={copyLink} className="flex-1 sm:flex-none">
                  {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </DsrtButton>
                <DsrtButton size="md" variant="outline" onClick={shareLink} className="flex-1 sm:flex-none text-white border-white/30 hover:bg-white/10">
                  <Share2 className="w-4 h-4 mr-1.5" />
                  Share
                </DsrtButton>
              </div>
            </div>
          </div>
        </div>
      </DsrtPanel>

      <DsrtPanel>
        <DsrtSection title={`Builders you invited (${referrals.length})`} headerVariant="mono" />

        {referrals.length === 0 ? (
          <div className="py-8">
            <DsrtEmpty icon={Users} title="No invites accepted yet" description="Share your link with builders you know." />
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04] mt-4 border-t border-white/[0.06]">
            {referrals.map((r) => (
              <Link
                key={r.id}
                href={`/profile/${r.users?.username}`}
                className="flex items-center gap-4 py-4 group hover:bg-white/[0.02] px-2 -mx-2 transition-colors rounded-lg"
              >
                <DsrtAvatar src={r.users?.avatar_url} name={r.users?.full_name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[14px] text-white group-hover:text-[#93c5fd] transition-colors">{r.users?.full_name}</p>
                  <p className="text-[11px] font-mono text-white/40 mt-0.5">
                    Joined {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </p>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Active
                </span>
              </Link>
            ))}
          </div>
        )}
      </DsrtPanel>
    </div>
  )
}