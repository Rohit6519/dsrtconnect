'use client'

import { useAppStudio } from '../AppStudioContext'
import { AppStepFooter } from './AppStepFooter'
import { ProjectEvidencePicker } from './parts/ProjectEvidencePicker'
import { LinksAndResumeCard } from './parts/LinksAndResumeCard'
import { FolderSimple, LinkSimple, CheckCircle, Warning } from '@phosphor-icons/react'

export function EvidenceStep() {
  const { draft } = useAppStudio()
  const app = draft.application
  const opp = draft.opportunity
  const requirements = draft.requirements || []

  const highlightedProjects = app.highlighted_projects || []
  const hasResume = !!app.resume_url
  const hasPortfolio = !!(app.portfolio_url || app.website_url || app.github_url)

  return (
    <>
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8">
        
        {/* Main Content */}
        <div className="space-y-6">
          <div>
            <h2 className="text-[20px] font-bold text-white mb-1">Evidence & Proof of Work</h2>
            <p className="text-[12.5px] text-zinc-500">
              Don't just tell employers what you can do — show them what you've built.
            </p>
          </div>

          {/* Project & Venture Evidence Picker */}
          <ProjectEvidencePicker />

          {/* Resume & Online Links */}
          <LinksAndResumeCard />
        </div>

        {/* Sidebar Summary */}
        <div className="hidden lg:block">
          <div className="sticky top-[100px] space-y-4">
            
            {/* Required Attachments Checklist */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500 mb-4">
                Required Attachments
              </h3>

              <div className="space-y-3">
                <CheckItem
                  label="Resume / CV"
                  required={!!opp.require_resume}
                  met={hasResume}
                />
                <CheckItem
                  label="Portfolio Link"
                  required={!!opp.require_portfolio}
                  met={!!app.portfolio_url}
                />
                <CheckItem
                  label="GitHub Profile"
                  required={!!opp.require_github}
                  met={!!app.github_url}
                />
                <CheckItem
                  label="Personal Website"
                  required={!!opp.require_website}
                  met={!!app.website_url}
                />
              </div>

              <div className="my-4 border-t border-zinc-800/70" />

              <div className="flex justify-between items-center text-[12px]">
                <span className="text-zinc-500">Showcased Projects</span>
                <span className="text-white font-bold">{highlightedProjects.length}</span>
              </div>
            </div>

            {/* DSRT Evidence Philosophy */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500 mb-2">
                DSRT Evidence Engine
              </h3>
              <p className="text-[12px] text-zinc-400 leading-relaxed">
                When you attach DSRT projects, the employer gets verified contribution history directly attached to your application card.
              </p>
            </div>

          </div>
        </div>

      </div>

      <AppStepFooter prev="questions" next="review" />
    </>
  )
}

function CheckItem({ label, required, met }: { label: string; required: boolean; met: boolean }) {
  if (!required) return null

  return (
    <div className="flex items-center justify-between text-[12.5px]">
      <span className="text-zinc-300 font-medium">{label}</span>
      {met ? (
        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11.5px]">
          <CheckCircle size={14} weight="fill" /> Ready
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-amber-400 font-semibold text-[11.5px]">
          <Warning size={14} weight="fill" /> Required
        </span>
      )}
    </div>
  )
}