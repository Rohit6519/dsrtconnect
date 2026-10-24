'use client'

import Link from 'next/link'
import { ArrowUpRight, FileText, Link as LinkIcon, GithubLogo, LinkedinLogo, Globe } from '@phosphor-icons/react'

const ICONS: Record<string, any> = {
  resume: FileText,
  portfolio: LinkIcon,
  github: GithubLogo,
  linkedin: LinkedinLogo,
  website: Globe,
}

export function DocumentsPanel({ documents, application }: { documents: any[]; application: any }) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500 mb-4">Your submission</h3>

      {documents.length === 0 ? (
        <div className="text-[12px] text-zinc-500">No links attached.</div>
      ) : (
        <ul className="space-y-2 mb-4">
          {documents.map((d: any) => {
            const Icon = ICONS[d.key] || LinkIcon
            return (
              <li key={d.key}>
                <a
                  href={d.url}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-950/60 px-3 py-2 text-[12.5px] text-zinc-300 hover:text-white transition-colors"
                >
                  <Icon size={13} className="text-zinc-500" />
                  <span className="flex-1 truncate">{d.label}</span>
                  <ArrowUpRight size={11} weight="bold" />
                </a>
              </li>
            )
          })}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-3 text-[11.5px]">
        <SummaryCell label="Skills highlighted" value={(application.highlighted_skills || []).length} />
        <SummaryCell label="Availability" value={application.availability ? String(application.availability).replace(/_/g, ' ') : '—'} capitalize />
        {application.expected_hours && <SummaryCell label="Hours/week" value={`${application.expected_hours} hrs`} />}
        {application.proposed_compensation && (
          <SummaryCell
            label="Proposed"
            value={`${application.proposed_compensation_currency || 'USD'} ${application.proposed_compensation}${application.proposed_compensation_type ? ` / ${application.proposed_compensation_type}` : ''}`}
          />
        )}
      </div>
    </div>
  )
}

function SummaryCell({ label, value, capitalize }: { label: string; value: any; capitalize?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{label}</div>
      <div className={'text-white font-semibold ' + (capitalize ? 'capitalize' : '')}>{value}</div>
    </div>
  )
}