'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, CheckCircle } from '@phosphor-icons/react'

interface Props {
  draft: any
  onUpdate: (patch: any) => void
}

export function PosterAboutPanel({ draft, onUpdate }: Props) {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (!authUser) return
      const { data: profile } = await supabase
        .from('users')
        .select('id, username, full_name, avatar_url, tagline, bio, location, is_verified, follower_count')
        .eq('id', authUser.id)
        .single()
      setUser(profile)
    })
  }, [supabase])

  if (!user) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-8 text-center">
        <p className="text-[13px] text-zinc-500">Loading your profile...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <h2 className="text-[16px] font-bold text-white mb-1">About the poster</h2>
        <p className="text-[12.5px] text-zinc-500 mb-6">
          This is how you'll appear to applicants. Your profile is pulled directly from DSRT.
        </p>

        {/* Profile preview */}
        <div className="flex items-start gap-4 p-4 rounded-lg bg-zinc-950 border border-zinc-800">
          <div className="w-14 h-14 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={20} className="text-zinc-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="text-[15px] font-bold text-white">
                {user.full_name || user.username}
              </h3>
              {user.is_verified && (
                <CheckCircle size={13} weight="fill" className="text-blue-400 shrink-0" />
              )}
            </div>
            {user.tagline && (
              <p className="text-[12.5px] text-zinc-400 leading-relaxed">{user.tagline}</p>
            )}
            {user.location && (
              <p className="text-[11.5px] text-zinc-500 mt-1">{user.location}</p>
            )}
            {user.follower_count > 0 && (
              <p className="text-[11px] text-zinc-500 mt-2">
                {user.follower_count.toLocaleString()} followers
              </p>
            )}
          </div>
        </div>

        {user.bio && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <h4 className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">About</h4>
            <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {user.bio}
            </p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-zinc-800">
          <p className="text-[11.5px] text-zinc-500 leading-relaxed">
            To edit your profile, tagline, or bio, go to your profile settings.
            Applicants will see the most up-to-date version.
          </p>
        </div>
      </div>
    </div>
  )
}