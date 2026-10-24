'use client'

import { ProjectHorizontalCard, ProjectHorizontalCardData } from './ProjectHorizontalCard'

interface SectionRowProps {
  title: string
  subtitle?: string
  projects: ProjectHorizontalCardData[]
  onDeleteRequest: (p: ProjectHorizontalCardData) => void
  emptyMessage?: string
}

export function ProjectSectionRow({
  title,
  subtitle,
  projects,
  onDeleteRequest,
  emptyMessage,
}: SectionRowProps) {
  if (projects.length === 0 && !emptyMessage) return null

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-[16px] font-bold text-white flex items-center gap-2">
          {title}
          <span className="text-[11px] font-normal text-zinc-500">{projects.length}</span>
        </h2>
        {subtitle && (
          <p className="text-[12.5px] text-zinc-500 mt-0.5">{subtitle}</p>
        )}
      </div>

      {projects.length > 0 ? (
        <div className="space-y-4">
          {projects.map(p => (
            <ProjectHorizontalCard
              key={p.id}
              project={p}
              onDeleteRequest={onDeleteRequest}
            />
          ))}
        </div>
      ) : emptyMessage ? (
        <div className="p-8 border border-white/[0.05] rounded-xl bg-[#0d0d10]/50 text-center">
          <p className="text-[12.5px] text-zinc-500">{emptyMessage}</p>
        </div>
      ) : null}
    </section>
  )
}