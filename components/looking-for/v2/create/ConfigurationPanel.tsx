'use client'

import { CategoryPicker } from './CategoryPicker'
import { CompensationBuilder } from './CompensationBuilder'
import { SkillsPicker } from './SkillsPicker'
import { CustomQuestionsBuilder } from './CustomQuestionsBuilder'
import { LocationAutocomplete } from './LocationAutocomplete'
interface Props {
  draft: any
  onUpdate: (patch: any) => void
}

const OPPORTUNITY_TYPES = [
  { value: 'hire', label: 'Hire' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'project-collaboration', label: 'Project Collaboration' },
  { value: 'team-up', label: 'Team Up' },
  { value: 'cofounder', label: 'Co-founder' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'research', label: 'Research' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'open-source', label: 'Open Source' },
  { value: 'consulting', label: 'Consulting' },
]

const EXPERIENCE_LEVELS = [
  { value: 'any', label: 'Any' },
  { value: 'entry', label: 'Entry level' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
  { value: 'student', label: 'Student' },
  { value: 'graduate', label: 'Graduate' },
  { value: 'professional', label: 'Professional' },
]

const WORK_MODES = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'on-site', label: 'On-site' },
  { value: 'flexible', label: 'Flexible' },
]

const TIME_COMMITMENTS = [
  { value: '', label: 'Not specified' },
  { value: 'less-than-5', label: 'Less than 5 hrs/wk' },
  { value: '5-10', label: '5–10 hrs/wk' },
  { value: '10-20', label: '10–20 hrs/wk' },
  { value: '20-30', label: '20–30 hrs/wk' },
  { value: '30-plus', label: '30+ hrs/wk' },
  { value: 'flexible', label: 'Flexible' },
]

const PROJECT_LENGTHS = [
  { value: '', label: 'Not specified' },
  { value: 'one-off', label: 'One-off' },
  { value: 'less-than-1-month', label: 'Less than 1 month' },
  { value: '1-3-months', label: '1–3 months' },
  { value: '3-6-months', label: '3–6 months' },
  { value: '6-12-months', label: '6–12 months' },
  { value: 'long-term', label: 'Long-term' },
  { value: 'ongoing', label: 'Ongoing' },
]

const TEAM_CONTEXTS = [
  { value: '', label: 'Not specified' },
  { value: 'solo-builder', label: 'Solo builder' },
  { value: 'existing-team', label: 'Existing team' },
  { value: 'startup', label: 'Startup' },
  { value: 'company', label: 'Company' },
  { value: 'student-team', label: 'Student team' },
  { value: 'research-team', label: 'Research team' },
  { value: 'community', label: 'Community' },
  { value: 'organization', label: 'Organization' },
]

export function ConfigurationPanel({ draft, onUpdate }: Props) {
  return (
    <div className="space-y-4 lg:sticky lg:top-32 max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-hide">
      {/* Opportunity type */}
      <Section title="What are you looking for?">
        <SelectField
          value={draft?.opportunity_type || 'hire'}
          onChange={(v) => onUpdate({ opportunity_type: v })}
          options={OPPORTUNITY_TYPES}
          fieldName="opportunity_type"
        />
      </Section>

      {/* Category */}
      <Section title="Category">
        <CategoryPicker
          primaryId={draft?.primary_category_id}
          subcategoryId={draft?.subcategory_id}
          onChange={(pid, sid) => onUpdate({ primary_category_id: pid, subcategory_id: sid })}
        />
      </Section>

      {/* Experience */}
      <Section title="Experience level">
        <SelectField
          value={draft?.experience_level || 'any'}
          onChange={(v) => onUpdate({ experience_level: v === 'any' ? null : v })}
          options={EXPERIENCE_LEVELS}
        />
      </Section>

      {/* Compensation */}
      <Section title="Compensation">
        <CompensationBuilder draft={draft} onUpdate={onUpdate} />
      </Section>

      {/* Work mode */}
      <Section title="Work mode">
        <SelectField
          value={draft?.work_mode || 'remote'}
          onChange={(v) => onUpdate({ work_mode: v })}
          options={WORK_MODES}
        />
      </Section>

            {/* Location */}
      <Section title="Location">
        <LocationAutocomplete
          value={draft?.location || ''}
          onChange={(loc: string) => onUpdate({ location: loc || null })}
          placeholder="Search any city worldwide..."
        />
      </Section>

      {/* Time commitment */}
      <Section title="Time commitment">
        <SelectField
          value={draft?.time_commitment || ''}
          onChange={(v) => onUpdate({ time_commitment: v || null })}
          options={TIME_COMMITMENTS}
        />
      </Section>

      {/* Project length */}
      <Section title="Project length">
        <SelectField
          value={draft?.project_length || ''}
          onChange={(v) => onUpdate({ project_length: v || null })}
          options={PROJECT_LENGTHS}
        />
      </Section>

      {/* Team context */}
      <Section title="Team context">
        <SelectField
          value={draft?.team_context || ''}
          onChange={(v) => onUpdate({ team_context: v || null })}
          options={TEAM_CONTEXTS}
        />
      </Section>

      {/* Positions open */}
      <Section title="Positions open">
        <input
          type="number"
          min={1}
          max={99}
          value={draft?.positions_open || 1}
          onChange={(e) => onUpdate({ positions_open: parseInt(e.target.value) || 1 })}
          className="w-full h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 focus:outline-none focus:border-zinc-700"
        />
      </Section>

      {/* Required skills */}
      <Section title="Required skills">
        <SkillsPicker
          value={draft?.required_skills || []}
          onChange={(skills) => onUpdate({ required_skills: skills })}
          placeholder="Add required skill..."
        />
      </Section>

      {/* Preferred skills */}
      <Section title="Nice to have">
        <SkillsPicker
          value={draft?.preferred_skills || []}
          onChange={(skills) => onUpdate({ preferred_skills: skills })}
          placeholder="Add preferred skill..."
        />
      </Section>

      {/* Deadlines */}
      <Section title="Application deadline">
        <input
          type="date"
          value={draft?.application_deadline ? draft.application_deadline.split('T')[0] : ''}
          onChange={(e) => onUpdate({ application_deadline: e.target.value ? new Date(e.target.value).toISOString() : null })}
          className="w-full h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 focus:outline-none focus:border-zinc-700"
        />
      </Section>

      {/* Start date */}
      <Section title="Start date">
        <input
          type="date"
          value={draft?.start_date || ''}
          onChange={(e) => onUpdate({ start_date: e.target.value || null })}
          className="w-full h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 focus:outline-none focus:border-zinc-700"
        />
      </Section>

      {/* Application requirements */}
      <Section title="Application requirements">
        <div className="space-y-1.5">
          <Checkbox
            label="Require cover letter"
            checked={draft?.require_cover_letter !== false}
            onChange={(v) => onUpdate({ require_cover_letter: v })}
          />
          <Checkbox
            label="Require resume"
            checked={draft?.require_resume || false}
            onChange={(v) => onUpdate({ require_resume: v })}
          />
          <Checkbox
            label="Require portfolio"
            checked={draft?.require_portfolio || false}
            onChange={(v) => onUpdate({ require_portfolio: v })}
          />
          <Checkbox
            label="Require GitHub"
            checked={draft?.require_github || false}
            onChange={(v) => onUpdate({ require_github: v })}
          />
          <Checkbox
            label="Require website"
            checked={draft?.require_website || false}
            onChange={(v) => onUpdate({ require_website: v })}
          />
        </div>
      </Section>

      {/* Custom questions */}
      <Section title="Custom questions">
        <CustomQuestionsBuilder
          value={draft?.custom_questions || []}
          onChange={(qs) => onUpdate({ custom_questions: qs })}
        />
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
      <h4 className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
        {title}
      </h4>
      {children}
    </div>
  )
}

function SelectField({
  value, onChange, options, fieldName,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  fieldName?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-field={fieldName}
      className="w-full h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 focus:outline-none focus:border-zinc-700 cursor-pointer"
    >
      {options.map(o => (
        <option key={o.value} value={o.value} className="bg-zinc-950">{o.label}</option>
      ))}
    </select>
  )
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 accent-white cursor-pointer"
      />
      <span className={
        'text-[12px] ' +
        (checked ? 'text-zinc-200 font-medium' : 'text-zinc-400 group-hover:text-zinc-200')
      }>
        {label}
      </span>
    </label>
  )
}