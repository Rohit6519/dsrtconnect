'use client'

import { useAppStudio } from '../../AppStudioContext'
import { LinkSimple } from '@phosphor-icons/react'

export function LinksAndResumeCard() {
  const { draft, updateField } = useAppStudio()
  const app = draft.application
  const opp = draft.opportunity

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <LinkSimple size={18} className="text-emerald-400" />
        <h3 className="text-[14px] font-bold text-white">Online Presences & Resume</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Resume URL */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
            Resume / CV URL {opp.require_resume && <span className="text-red-400">*</span>}
          </label>
          <input
            type="url"
            value={app.resume_url || ''}
            onChange={(e) => updateField({ resume_url: e.target.value })}
            placeholder="https://drive.google.com/..."
            className="w-full h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>

        {/* Portfolio URL */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
            Portfolio URL {opp.require_portfolio && <span className="text-red-400">*</span>}
          </label>
          <input
            type="url"
            value={app.portfolio_url || ''}
            onChange={(e) => updateField({ portfolio_url: e.target.value })}
            placeholder="https://yourportfolio.com"
            className="w-full h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>

        {/* GitHub URL */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
            GitHub URL {opp.require_github && <span className="text-red-400">*</span>}
          </label>
          <input
            type="url"
            value={app.github_url || ''}
            onChange={(e) => updateField({ github_url: e.target.value })}
            placeholder="https://github.com/username"
            className="w-full h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>

        {/* Personal Website */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
            Personal Website {opp.require_website && <span className="text-red-400">*</span>}
          </label>
          <input
            type="url"
            value={app.website_url || ''}
            onChange={(e) => updateField({ website_url: e.target.value })}
            placeholder="https://yourwebsite.com"
            className="w-full h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>
      </div>

      {/* Cover Message / Letter */}
      <div className="pt-2">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
          Cover Message / Additional Context
        </label>
        <textarea
          value={app.cover_message || ''}
          onChange={(e) => updateField({ cover_message: e.target.value })}
          rows={4}
          placeholder="Anything else you want the employer to know before reviewing your application..."
          className="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-y leading-relaxed"
        />
      </div>
    </div>
  )
}