'use client'

import { useState, useEffect } from 'react'
import { useAppStudio } from '../AppStudioContext'
import { AppStepFooter } from './AppStepFooter'
import { Sparkle, Info, CheckCircle } from '@phosphor-icons/react'

export function ProfileStep() {
  const { draft, updateField } = useAppStudio()
  const app = draft.application
  const snapshot = app.applicant_snapshot || {}
  
  // All skills the user has on their global DSRT profile
  const allSkills: string[] = snapshot.profile_tags || []
  
  // The subset of skills they choose to highlight for this specific application
  const [highlighted, setHighlighted] = useState<Set<string>>(
    new Set(app.highlighted_skills || [])
  )

  const toggleSkill = (skill: string) => {
    const next = new Set(highlighted)
    if (next.has(skill)) {
      next.delete(skill)
    } else {
      if (next.size >= 10) {
        alert("You can highlight a maximum of 10 skills.")
        return
      }
      next.add(skill)
    }
    setHighlighted(next)
    updateField({ highlighted_skills: Array.from(next) })
  }

  return (
    <>
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8">
        
        <div className="space-y-6">
          <div>
            <h2 className="text-[20px] font-bold text-white mb-1">Your Profile</h2>
            <p className="text-[12.5px] text-zinc-500">
              This information is pulled from your DSRT profile. Make sure it looks correct.
            </p>
          </div>

          {/* Profile Read-Only Snapshot */}
          <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center text-[18px] font-bold text-zinc-500">
                {snapshot.avatar_url ? (
                  <img src={snapshot.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (snapshot.full_name || snapshot.username || '?').charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <div className="text-[16px] font-bold text-white mb-0.5 flex items-center gap-1.5">
                  {snapshot.full_name || snapshot.username}
                  {snapshot.is_verified && <CheckCircle size={14} weight="fill" className="text-blue-400" />}
                </div>
                <div className="text-[13px] text-zinc-400 mb-1">{snapshot.tagline}</div>
                <div className="text-[11.5px] text-zinc-500">{snapshot.location}</div>
              </div>
            </div>

            {snapshot.bio && (
              <div className="mt-5 pt-5 border-t border-zinc-800/60">
                <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">About</h3>
                <p className="text-[13px] leading-relaxed text-zinc-300 whitespace-pre-wrap">{snapshot.bio}</p>
              </div>
            )}
          </div>

          {/* Relevant Skills Picker */}
          <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center gap-2 mb-1">
              <Sparkle size={16} weight="fill" className="text-emerald-400" />
              <h3 className="text-[14px] font-bold text-white">Highlight Relevant Skills</h3>
            </div>
            <p className="text-[12px] text-zinc-500 mb-5">
              Select up to 10 skills from your profile to highlight for this specific opportunity. This helps the reviewer see your fit immediately.
            </p>

            {allSkills.length === 0 ? (
              <div className="text-[12px] text-zinc-500 italic p-4 bg-zinc-950/50 rounded-xl border border-dashed border-zinc-800">
                You haven't added any skills to your DSRT profile yet. You can add them in your global profile settings.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allSkills.map(skill => {
                  const active = highlighted.has(skill)
                  return (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={
                        'h-8 px-3 rounded-lg border text-[12px] font-semibold transition-colors ' +
                        (active 
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' 
                          : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600 text-zinc-400 hover:text-white')
                      }
                    >
                      {skill}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="mt-4 text-[10.5px] text-zinc-500 font-medium">
              {highlighted.size} / 10 selected
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="hidden lg:block">
          <div className="sticky top-[100px] rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-2 mb-3">
              <Info size={16} className="text-zinc-400" />
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-zinc-300">How it works</h3>
            </div>
            <p className="text-[12.5px] text-zinc-400 leading-relaxed mb-4">
              Your profile information was captured as a <strong className="text-white">snapshot</strong> when you started this application.
            </p>
            <p className="text-[12.5px] text-zinc-400 leading-relaxed mb-4">
              If you update your global DSRT profile later, this submitted application will not change. The opportunity owner sees exactly what you submit right now.
            </p>
            <p className="text-[12.5px] text-zinc-400 leading-relaxed">
              Highlighting specific skills pushes them to the top of your application card for the reviewer.
            </p>
          </div>
        </div>
      </div>

      <AppStepFooter next="experience" />
    </>
  )
}