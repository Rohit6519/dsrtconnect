'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  Sparkle, Clock, MapPin, Users, CalendarBlank,
  Briefcase, FolderSimple, Rocket, GraduationCap,
} from '@phosphor-icons/react'

interface Props {
  opportunity: any
}

const TYPE_LABELS: Record<string, string> = {
  'hire': 'Hire',
  'freelance': 'Freelance',
  'part-time': 'Part-time',
  'full-time': 'Full-time',
  'contract': 'Contract',
  'project-collaboration': 'Project Collaboration',
  'team-up': 'Team Up',
  'cofounder': 'Co-founder',
  'mentorship': 'Mentorship',
  'research': 'Research',
  'open-source': 'Open Source',
  'volunteer': 'Volunteer',
  'consulting': 'Consulting',
  'student-collaboration': 'Student Collaboration',
}

const WORK_MODE_LABELS: Record<string, string> = {
  'remote': 'Remote',
  'hybrid': 'Hybrid',
  'on-site': 'On-site',
  'flexible': 'Flexible',
}

const LENGTH_LABELS: Record<string, string> = {
  'one-off': 'One-off',
  'less-than-1-month': 'Less than 1 month',
  '1-3-months': '1–3 months',
  '3-6-months': '3–6 months',
  '6-12-months': '6–12 months',
  'long-term': 'Long-term',
  'ongoing': 'Ongoing',
}

const TIME_LABELS: Record<string, string> = {
  'less-than-5': 'Less than 5 hrs/week',
  '5-10': '5–10 hrs/week',
  '10-20': '10–20 hrs/week',
  '20-30': '20–30 hrs/week',
  '30-plus': '30+ hrs/week',
  'flexible': 'Flexible',
}

export function OpportunityBody({ opportunity }: Props) {
  const type = TYPE_LABELS[opportunity.opportunity_type] || opportunity.opportunity_type
  const workMode = opportunity.work_mode ? WORK_MODE_LABELS[opportunity.work_mode] : null
  const timeCommit = opportunity.time_commitment ? TIME_LABELS[opportunity.time_commitment] : null
  const length = opportunity.project_length ? LENGTH_LABELS[opportunity.project_length] : null

  return (
    <article className="space-y-8">
      {/* ─── TITLE BLOCK ─── */}
      <section>
        {/* Type + Category badges */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="inline-flex items-center h-6 px-2 rounded text-[10.5px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {type}
          </span>
          {opportunity.primary_category && (
            <span className="inline-flex items-center h-6 px-2 rounded text-[10.5px] font-medium uppercase tracking-wider bg-zinc-900 text-zinc-400 border border-zinc-800">
              {opportunity.primary_category.name}
            </span>
          )}
          {opportunity.is_featured && (
            <span className="inline-flex items-center gap-1 h-6 px-2 rounded text-[10.5px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkle size={10} weight="fill" />
              Featured
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-[32px] md:text-[38px] font-bold text-white leading-[1.15] tracking-tight mb-3">
          {opportunity.title}
        </h1>

        {/* Subtitle */}
        {opportunity.subtitle && (
          <p className="text-[16px] text-zinc-400 leading-relaxed max-w-3xl">
            {opportunity.subtitle}
          </p>
        )}
      </section>

      {/* ─── CONTEXT BLOCK (Project/Venture card) ─── */}
      {(opportunity.project || opportunity.venture) && (
        <section>
          <ContextCard opportunity={opportunity} />
        </section>
      )}

      {/* ─── QUICK FACTS GRID ─── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {timeCommit && (
          <QuickFact Icon={Clock} label="Time" value={timeCommit} />
        )}
        {workMode && (
          <QuickFact
            Icon={MapPin}
            label="Location"
            value={opportunity.location || workMode}
          />
        )}
        {length && (
          <QuickFact Icon={CalendarBlank} label="Duration" value={length} />
        )}
        {opportunity.positions_open && opportunity.positions_open > 0 && (
          <QuickFact
            Icon={Users}
            label="Positions"
            value={String(opportunity.positions_open)}
          />
        )}
      </section>

      {/* ─── DESCRIPTION ─── */}
      {(opportunity.description || opportunity.content_text) && (
        <Section title="About this opportunity">
          <div className="prose prose-invert prose-sm max-w-none text-[14.5px] leading-[1.7] text-zinc-300 whitespace-pre-wrap">
            {opportunity.content_text || opportunity.description}
          </div>
        </Section>
      )}

      {/* ─── REQUIRED SKILLS ─── */}
      {opportunity.required_skills && opportunity.required_skills.length > 0 && (
        <Section title="Required skills">
          <div className="flex flex-wrap gap-2">
            {opportunity.required_skills.map((s: string) => (
              <span
                key={s}
                className="inline-flex items-center h-7 px-2.5 rounded-md text-[12px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-200"
              >
                {s}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* ─── PREFERRED SKILLS ─── */}
      {opportunity.preferred_skills && opportunity.preferred_skills.length > 0 && (
        <Section title="Nice to have">
          <div className="flex flex-wrap gap-2">
            {opportunity.preferred_skills.map((s: string) => (
              <span
                key={s}
                className="inline-flex items-center h-7 px-2.5 rounded-md text-[12px] font-medium bg-zinc-950 border border-dashed border-zinc-800 text-zinc-400"
              >
                {s}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* ─── EXPERIENCE LEVEL ─── */}
      {opportunity.experience_level && opportunity.experience_level !== 'any' && (
        <Section title="Experience level">
          <p className="text-[14px] text-zinc-300 capitalize">
            {opportunity.experience_level.replace(/-/g, ' ')}
          </p>
        </Section>
      )}

      {/* ─── CUSTOM QUESTIONS PREVIEW ─── */}
      {opportunity.custom_questions && opportunity.custom_questions.length > 0 && (
        <Section title="Application questions">
          <p className="text-[12.5px] text-zinc-500 mb-3">
            You'll be asked to answer these when you apply:
          </p>
          <ol className="space-y-2 list-decimal list-inside">
            {opportunity.custom_questions.map((q: any, i: number) => (
              <li key={i} className="text-[13.5px] text-zinc-300 leading-relaxed">
                {typeof q === 'string' ? q : q.question}
                {q.required && <span className="text-blue-400 ml-1">*</span>}
              </li>
            ))}
          </ol>
        </Section>
      )}
    </article>
  )
}

// ─── Sub-components ───

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500 mb-3">
        {title}
      </h3>
      {children}
    </section>
  )
}

function QuickFact({
  Icon, label, value,
}: {
  Icon: any
  label: string
  value: string
}) {
  return (
    <div className={
      'rounded-xl border border-zinc-800/60 p-3.5 ' +
      'bg-gradient-to-b from-zinc-900/40 to-zinc-950/60 ' +
      'shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_2px_10px_rgba(0,0,0,0.25)]'
    }>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={11} weight="regular" className="text-zinc-500" />
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">
          {label}
        </span>
      </div>
      <p className="text-[13px] font-semibold text-zinc-100 truncate">
        {value}
      </p>
    </div>
  )
}

function ContextCard({ opportunity }: { opportunity: any }) {
  const project = opportunity.project
  const venture = opportunity.venture

  if (project) {
    return (
      <Link
        href={`/projects/${project.slug}`}
        className="group flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-950/70 transition-all shadow-[0_2px_16px_rgba(0,0,0,0.35)]"
      >
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 flex items-center justify-center">
          {project.cover_image_url ? (
            <img src={project.cover_image_url} alt="" className="w-full h-full object-cover" />
          ) : project.icon ? (
            <span className="text-xl">{project.icon}</span>
          ) : (
            <FolderSimple size={18} className="text-zinc-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">
            Part of project
          </div>
          <div className="text-[15px] font-bold text-white group-hover:text-blue-400 truncate transition-colors">
            {project.name}
          </div>
          {project.tagline && (
            <p className="text-[12.5px] text-zinc-400 mt-0.5 truncate">
              {project.tagline}
            </p>
          )}
        </div>
      </Link>
    )
  }

  if (venture) {
    return (
      <Link
        href={`/ventures/${venture.slug}`}
        className="group flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-950/70 transition-all shadow-[0_2px_16px_rgba(0,0,0,0.35)]"
      >
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 flex items-center justify-center">
          {venture.logo_url ? (
            <img src={venture.logo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Rocket size={18} className="text-zinc-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">
            Part of venture
          </div>
          <div className="text-[15px] font-bold text-white group-hover:text-blue-400 truncate transition-colors">
            {venture.name}
          </div>
          {venture.tagline && (
            <p className="text-[12.5px] text-zinc-400 mt-0.5 truncate">
              {venture.tagline}
            </p>
          )}
        </div>
      </Link>
    )
  }

  return null
}