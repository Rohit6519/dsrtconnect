'use client'

import { useEffect, useState } from 'react'
import { useAppStudio } from '../../AppStudioContext'
import { FolderSimple, Check, Plus, CircleNotch } from '@phosphor-icons/react'

export function ProjectEvidencePicker() {
  const { draft, updateField } = useAppStudio()
  const app = draft.application
  const highlightedProjects: string[] = app.highlighted_projects || []

  const [userProjects, setUserProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/projects?limit=20')
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((d) => setUserProjects(d.projects || d.items || []))
      .catch(() => setUserProjects([]))
      .finally(() => setLoading(false))
  }, [])

  const toggleProject = (projectId: string) => {
    let next: string[]
    if (highlightedProjects.includes(projectId)) {
      next = highlightedProjects.filter((id) => id !== projectId)
    } else {
      if (highlightedProjects.length >= 5) {
        alert('You can select a maximum of 5 projects.')
        return
      }
      next = [...highlightedProjects, projectId]
    }
    updateField({ highlighted_projects: next })
  }

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center gap-2 mb-1">
        <FolderSimple size={18} className="text-blue-400" />
        <h3 className="text-[14px] font-bold text-white">Attach DSRT Projects</h3>
      </div>
      <p className="text-[12px] text-zinc-500 mb-5">
        Select projects from your portfolio to attach as proof of experience for this opportunity.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-[12.5px] text-zinc-500 justify-center">
          <CircleNotch size={16} className="animate-spin" />
          <span>Loading your DSRT projects...</span>
        </div>
      ) : userProjects.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 text-center text-zinc-500 text-[12.5px]">
          No published DSRT projects found on your account. You can still paste external links below.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {userProjects.map((proj) => {
            const isSelected = highlightedProjects.includes(proj.id)
            return (
              <button
                key={proj.id}
                type="button"
                onClick={() => toggleProject(proj.id)}
                className={
                  'flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ' +
                  (isSelected
                    ? 'border-blue-500/50 bg-blue-500/10 shadow-[0_2px_12px_rgba(59,130,246,0.15)]'
                    : 'border-zinc-800 bg-zinc-950/50 hover:bg-zinc-900/50 hover:border-zinc-700')
                }
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                  {proj.cover_image_url ? (
                    <img src={proj.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : proj.icon ? (
                    <span className="text-lg">{proj.icon}</span>
                  ) : (
                    <FolderSimple size={18} className="text-zinc-500" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-white truncate">{proj.name}</div>
                  {proj.tagline && (
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">{proj.tagline}</p>
                  )}
                </div>

                <div className="shrink-0">
                  <div
                    className={
                      'w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ' +
                      (isSelected
                        ? 'border-blue-400 bg-blue-500 text-white'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-500')
                    }
                  >
                    {isSelected ? <Check size={12} weight="bold" /> : <Plus size={12} weight="bold" />}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {userProjects.length > 0 && (
        <div className="mt-4 text-[10.5px] text-zinc-500 font-medium">
          {highlightedProjects.length} of 5 projects selected
        </div>
      )}
    </div>
  )
}