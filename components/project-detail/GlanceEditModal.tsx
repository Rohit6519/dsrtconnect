'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Check, MagnifyingGlass, Warning, CircleNotch,
  Compass, Eye, EyeSlash, Flag, Buildings, Briefcase, Calendar, MapPin,
  Code, Certificate, Books, Flask, Lock, IdentificationCard, Storefront,
  CaretDown,
} from '@phosphor-icons/react'
import { createPortal } from 'react-dom'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  field: string
  currentValue: any
  onClose: () => void
  onSave: (patch: Record<string, any>) => Promise<void>
}

type Option = { id: string; label: string; description?: string; badge?: string }

// ═══════════════════════════════════════════════════════════════════════════
// FIELD REGISTRY
// Central metadata for every editable field
// ═══════════════════════════════════════════════════════════════════════════

interface FieldMeta {
  title: string
  description?: string
  icon: any
  input: 'select' | 'text' | 'textarea' | 'number' | 'date' | 'boolean' | 'autocomplete-industry' | 'autocomplete-location' | 'license' | 'visibility'
  options?: Option[]
  placeholder?: string
  min?: number
  max?: number
  maxLength?: number
  validate?: (v: any) => string | null
}

const FIELDS: Record<string, FieldMeta> = {
  // ─── At a Glance ─────────────────────────────────────────────────────
  stage: {
    title: 'Project Stage',
    description: 'What phase is your project currently in?',
    icon: Flag,
    input: 'select',
    options: [
      { id: 'idea',        label: 'Idea',        description: 'Early concept, not yet started' },
      { id: 'research',    label: 'Research',    description: 'Exploring feasibility and technical direction' },
      { id: 'planning',    label: 'Planning',    description: 'Architecting and defining scope' },
      { id: 'prototype',   label: 'Prototype',   description: 'Building an initial version' },
      { id: 'mvp',         label: 'MVP',         description: 'Minimum viable product ready' },
      { id: 'beta',        label: 'Beta',        description: 'Testing with early users' },
      { id: 'production',  label: 'Production',  description: 'Live and stable' },
      { id: 'scaling',     label: 'Scaling',     description: 'Growing user base and infrastructure' },
      { id: 'completed',   label: 'Completed',   description: 'Finished, no active development' },
      { id: 'on-hold',     label: 'On Hold',     description: 'Paused for now' },
    ],
  },

  industry: {
    title: 'Industry',
    description: 'The primary industry or sector for your project.',
    icon: Buildings,
    input: 'autocomplete-industry',
    placeholder: 'Search industries...',
  },

  project_type: {
    title: 'Project Type',
    description: 'What kind of project is this?',
    icon: Briefcase,
    input: 'select',
    options: [
      { id: 'personal',    label: 'Personal Project', description: 'Building for yourself or fun' },
      { id: 'startup',     label: 'Startup',          description: 'Building a company or venture' },
      { id: 'research',    label: 'Research',         description: 'Academic or scientific research' },
      { id: 'hackathon',   label: 'Hackathon',        description: 'Built at a hackathon' },
      { id: 'open-source', label: 'Open Source',      description: 'Public collaborative project' },
      { id: 'learning',    label: 'Learning',         description: 'Educational or skill-building' },
      { id: 'portfolio',   label: 'Portfolio',        description: 'Showcasing your skills' },
      { id: 'client-work', label: 'Client Work',      description: 'Built for a client' },
      { id: 'mvp',         label: 'MVP',              description: 'Testing a business idea' },
      { id: 'bootcamp',    label: 'Bootcamp',         description: 'Bootcamp or course project' },
      { id: 'case-study',  label: 'Case Study',       description: 'Deep exploration of a problem' },
      { id: 'community',   label: 'Community',        description: 'For a community you serve' },
      { id: 'creative',    label: 'Creative',         description: 'Art, design, or expression' },
      { id: 'experiment',  label: 'Experiment',       description: 'Testing a hypothesis' },
    ],
  },

  founded_date: {
    title: 'Founded Date',
    description: 'When did you start this project?',
    icon: Calendar,
    input: 'date',
    validate: (v) => {
      if (!v) return null
      const d = new Date(v)
      if (isNaN(d.getTime())) return 'Invalid date'
      if (d > new Date()) return 'Date cannot be in the future'
      return null
    },
  },

  open_roles: {
    title: 'Open Roles',
    description: 'How many positions are you actively hiring for?',
    icon: Briefcase,
    input: 'number',
    min: 0,
    max: 99,
    validate: (v) => {
      const n = parseInt(v)
      if (isNaN(n)) return 'Must be a number'
      if (n < 0) return 'Cannot be negative'
      if (n > 99) return 'Max 99'
      return null
    },
  },

  location: {
    title: 'Location',
    description: 'Where is your project based? Use "Remote" if distributed.',
    icon: MapPin,
    input: 'autocomplete-location',
    placeholder: 'e.g. Bengaluru, Remote, San Francisco',
    maxLength: 100,
  },

  visibility: {
    title: 'Project Visibility',
    description: 'Who can see this project?',
    icon: Compass,
    input: 'visibility',
  },

  // ─── Intellectual Property ────────────────────────────────────────────
  is_open_source: {
    title: 'Source Code',
    description: 'Is your project open source?',
    icon: Code,
    input: 'select',
    options: [
      { id: 'true',  label: 'Open Source',   description: 'Anyone can view, use, and contribute' },
      { id: 'false', label: 'Closed Source', description: 'Source code is private' },
    ],
  },

  license: {
    title: 'License',
    description: 'What license governs your project?',
    icon: Certificate,
    input: 'license',
  },

  patent_status: {
    title: 'Patent Status',
    description: 'Do you have or are you pursuing patents?',
    icon: Books,
    input: 'select',
    options: [
      { id: 'none',    label: 'None',    description: 'No patents involved' },
      { id: 'pending', label: 'Pending', description: 'Application filed, awaiting decision' },
      { id: 'granted', label: 'Granted', description: 'Patent has been awarded' },
      { id: 'filed',   label: 'Filed',   description: 'Formal patent application submitted' },
    ],
  },

  research_status: {
    title: 'Research Status',
    description: 'What is the research maturity of this project?',
    icon: Flask,
    input: 'select',
    options: [
      { id: 'none',          label: 'None',          description: 'Not a research project' },
      { id: 'ongoing',       label: 'Ongoing',       description: 'Actively researching' },
      { id: 'published',     label: 'Published',     description: 'Results have been published' },
      { id: 'peer_reviewed', label: 'Peer Reviewed', description: 'Passed formal peer review' },
    ],
  },

  has_proprietary_tech: {
    title: 'Proprietary Technology',
    description: 'Does this project contain proprietary or trade-secret technology?',
    icon: Lock,
    input: 'select',
    options: [
      { id: 'true',  label: 'Yes', description: 'Contains proprietary technology or trade secrets' },
      { id: 'false', label: 'No',  description: 'No proprietary technology involved' },
    ],
  },

  ip_ownership: {
    title: 'IP Ownership',
    description: 'Who owns the intellectual property rights?',
    icon: IdentificationCard,
    input: 'select',
    options: [
      { id: 'founder',        label: 'Founder',        description: 'You personally own the IP' },
      { id: 'organization',   label: 'Organization',   description: 'A company or org owns the IP' },
      { id: 'shared',         label: 'Shared',         description: 'Multiple parties share ownership' },
      { id: 'university',     label: 'University',     description: 'A university or research institution owns the IP' },
      { id: 'public_domain',  label: 'Public Domain',  description: 'No IP restrictions apply' },
    ],
  },

  commercial_use: {
    title: 'Commercial Use',
    description: 'Can this project be used commercially?',
    icon: Storefront,
    input: 'select',
    options: [
      { id: 'commercial',      label: 'Commercial',      description: 'Free to use commercially' },
      { id: 'non-commercial',  label: 'Non-commercial',  description: 'Only for non-commercial purposes' },
      { id: 'dual',            label: 'Dual License',    description: 'Different terms for different uses' },
      { id: 'not_specified',   label: 'Not Specified',   description: 'No commercial policy defined' },
    ],
  },
}

// Common software licenses
const COMMON_LICENSES: Option[] = [
  { id: 'None',           label: 'None',              description: 'No license specified' },
  { id: 'MIT',            label: 'MIT',               description: 'Permissive — very common' },
  { id: 'Apache-2.0',     label: 'Apache 2.0',        description: 'Permissive with patent grant' },
  { id: 'GPL-3.0',        label: 'GPL v3',            description: 'Strong copyleft' },
  { id: 'GPL-2.0',        label: 'GPL v2',            description: 'Older copyleft license' },
  { id: 'AGPL-3.0',       label: 'AGPL v3',           description: 'Copyleft for network use' },
  { id: 'LGPL-3.0',       label: 'LGPL v3',           description: 'Weaker copyleft' },
  { id: 'BSD-3-Clause',   label: 'BSD 3-Clause',      description: 'Permissive, minimal restrictions' },
  { id: 'BSD-2-Clause',   label: 'BSD 2-Clause',      description: 'Even simpler than BSD-3' },
  { id: 'MPL-2.0',        label: 'MPL 2.0',           description: 'Mozilla Public License' },
  { id: 'ISC',            label: 'ISC',               description: 'Functionally like MIT' },
  { id: 'Unlicense',      label: 'Unlicense',         description: 'Public domain dedication' },
  { id: 'CC0-1.0',        label: 'CC0',               description: 'Creative Commons — no rights reserved' },
  { id: 'CC-BY-4.0',      label: 'CC BY 4.0',         description: 'Creative Commons — attribution' },
  { id: 'CC-BY-SA-4.0',   label: 'CC BY-SA 4.0',      description: 'Creative Commons — share-alike' },
  { id: 'Proprietary',    label: 'Proprietary',       description: 'All rights reserved' },
  { id: 'Custom',         label: 'Custom',            description: 'Your own custom license' },
]

// ═══════════════════════════════════════════════════════════════════════════
// MAIN MODAL
// ═══════════════════════════════════════════════════════════════════════════

export function GlanceEditModal({ field, currentValue, onClose, onSave }: Props) {
  const meta = FIELDS[field]
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // ─── Universal state ─────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Body scroll lock + mount ────────────────────────────────────────
  useEffect(() => {
    setMounted(true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // ─── Keyboard: Esc to close ──────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  // ─── Unknown field guard ─────────────────────────────────────────────
  if (!meta) {
    return null
  }

  const Icon = meta.icon

  // ─── Save handler with per-input payload transform ───────────────────
  const handleSave = async (value: any) => {
    // Client validation
    if (meta.validate) {
      const err = meta.validate(value)
      if (err) { setError(err); return }
    }

    setSaving(true)
    setError(null)

    try {
      const patch: Record<string, any> = {}

      switch (field) {
        case 'is_open_source':
        case 'has_proprietary_tech':
          patch[field] = value === true || value === 'true'
          break

        case 'open_roles':
          patch[field] = Math.max(0, Math.min(99, parseInt(value) || 0))
          break

        case 'founded_date':
          patch[field] = value || null
          break

        case 'visibility': {
          // value = { visibility: 'public'|'unlisted'|'private', show_in_explore: boolean }
          patch.visibility = value.visibility
          patch.is_public = value.visibility === 'public'
          patch.show_in_explore = value.visibility === 'public' && !!value.show_in_explore
          break
        }

        default:
          patch[field] = typeof value === 'string' ? value.trim() : value
      }

      await onSave(patch)
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-start md:items-center justify-center p-0 md:p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose() }}
    >
      <div
        ref={containerRef}
        className="bg-[#0d0d10] border border-white/[0.08] w-full max-w-[520px] md:rounded-2xl overflow-hidden flex flex-col min-h-screen md:min-h-0 md:max-h-[90vh] shadow-[0_0_60px_rgba(0,0,0,0.6)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="glance-modal-title"
      >
        {/* ─── HEADER ─────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 px-6 py-5 border-b border-white/[0.06] flex-shrink-0">
          <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
            <Icon size={17} weight="regular" className="text-white/70" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 id="glance-modal-title" className="text-[15.5px] font-semibold text-white leading-tight">
              {meta.title}
            </h3>
            {meta.description && (
              <p className="text-[12.5px] text-white/50 mt-0.5 leading-snug">
                {meta.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="w-8 h-8 rounded-md text-white/50 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* ─── BODY ───────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <FieldInput
            field={field}
            meta={meta}
            currentValue={currentValue}
            saving={saving}
            error={error}
            onError={setError}
            onSave={handleSave}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(modalContent, document.body)
}

// ═══════════════════════════════════════════════════════════════════════════
// FIELD INPUT DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════

function FieldInput({
  field, meta, currentValue, saving, error, onError, onSave, onClose,
}: {
  field: string
  meta: FieldMeta
  currentValue: any
  saving: boolean
  error: string | null
  onError: (e: string | null) => void
  onSave: (value: any) => void
  onClose: () => void
}) {
  switch (meta.input) {
    case 'select':
      return <SelectInput meta={meta} currentValue={currentValue} saving={saving} error={error} onSave={onSave} onClose={onClose} />

    case 'text':
      return <TextInput meta={meta} currentValue={currentValue} saving={saving} error={error} onError={onError} onSave={onSave} onClose={onClose} />

    case 'number':
      return <NumberInput meta={meta} currentValue={currentValue} saving={saving} error={error} onError={onError} onSave={onSave} onClose={onClose} />

    case 'date':
      return <DateInput meta={meta} currentValue={currentValue} saving={saving} error={error} onError={onError} onSave={onSave} onClose={onClose} />

    case 'autocomplete-industry':
      return <IndustryInput meta={meta} currentValue={currentValue} saving={saving} error={error} onError={onError} onSave={onSave} onClose={onClose} />

    case 'autocomplete-location':
      return <LocationInput meta={meta} currentValue={currentValue} saving={saving} error={error} onError={onError} onSave={onSave} onClose={onClose} />

    case 'license':
      return <LicenseInput currentValue={currentValue} saving={saving} error={error} onError={onError} onSave={onSave} onClose={onClose} />

    case 'visibility':
      return <VisibilityInput currentValue={currentValue} saving={saving} error={error} onSave={onSave} onClose={onClose} />

    default:
      return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERIC SELECT (used for stages, project_type, IP fields, etc.)
// ═══════════════════════════════════════════════════════════════════════════

function SelectInput({
  meta, currentValue, saving, error, onSave, onClose,
}: {
  meta: FieldMeta
  currentValue: any
  saving: boolean
  error: string | null
  onSave: (v: any) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<string>(() => String(currentValue ?? meta.options?.[0]?.id ?? ''))

  const options = meta.options || []

  return (
    <>
      <div className="p-5">
        <div className="space-y-1.5">
          {options.map(opt => {
            const isSelected = selected === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => setSelected(opt.id)}
                onDoubleClick={() => !saving && onSave(opt.id)}
                disabled={saving}
                className={
                  'w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 disabled:cursor-wait ' +
                  (isSelected
                    ? 'bg-white/[0.08] border-white/[0.2]'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]')
                }
              >
                <div className={
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ' +
                  (isSelected ? 'bg-white border-white' : 'border-white/25')
                }>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={'text-[13.5px] font-semibold leading-tight ' + (isSelected ? 'text-white' : 'text-white/85')}>
                    {opt.label}
                  </p>
                  {opt.description && (
                    <p className="text-[11.5px] text-white/45 mt-0.5 leading-snug">
                      {opt.description}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <ModalFooter
        saving={saving}
        error={error}
        canSave={!!selected}
        onCancel={onClose}
        onSave={() => onSave(selected)}
      />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TEXT INPUT
// ═══════════════════════════════════════════════════════════════════════════

function TextInput({
  meta, currentValue, saving, error, onError, onSave, onClose,
}: {
  meta: FieldMeta
  currentValue: any
  saving: boolean
  error: string | null
  onError: (e: string | null) => void
  onSave: (v: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState<string>(String(currentValue ?? ''))

  return (
    <>
      <div className="p-5">
        <input
          autoFocus
          value={value}
          onChange={e => { setValue(e.target.value); onError(null) }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !saving) { e.preventDefault(); onSave(value) }
          }}
          placeholder={meta.placeholder || 'Enter value...'}
          maxLength={meta.maxLength}
          className="w-full h-11 bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-white/25 focus:bg-white/[0.06] transition-colors"
        />
        {meta.maxLength && (
          <p className="text-[10.5px] text-white/30 font-mono mt-1.5 text-right">
            {value.length}/{meta.maxLength}
          </p>
        )}
      </div>

      <ModalFooter
        saving={saving}
        error={error}
        canSave={true}
        onCancel={onClose}
        onSave={() => onSave(value)}
      />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// NUMBER INPUT
// ═══════════════════════════════════════════════════════════════════════════

function NumberInput({
  meta, currentValue, saving, error, onError, onSave, onClose,
}: {
  meta: FieldMeta
  currentValue: any
  saving: boolean
  error: string | null
  onError: (e: string | null) => void
  onSave: (v: number) => void
  onClose: () => void
}) {
  const [value, setValue] = useState<number>(() => {
    const n = parseInt(currentValue)
    return isNaN(n) ? 0 : n
  })

  const min = meta.min ?? 0
  const max = meta.max ?? 999

  const step = (delta: number) => {
    const next = Math.max(min, Math.min(max, value + delta))
    setValue(next)
    onError(null)
  }

  return (
    <>
      <div className="p-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => step(-1)}
            disabled={value <= min || saving}
            className="w-11 h-11 rounded-lg bg-white/[0.04] border border-white/[0.1] text-white/70 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 text-lg font-bold flex items-center justify-center transition-colors"
          >
            −
          </button>
          <input
            autoFocus
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={e => {
              const n = parseInt(e.target.value)
              setValue(isNaN(n) ? 0 : Math.max(min, Math.min(max, n)))
              onError(null)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !saving) { e.preventDefault(); onSave(value) }
            }}
            className="flex-1 h-11 bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 text-center text-[16px] font-semibold text-white outline-none focus:border-white/25 focus:bg-white/[0.06] transition-colors tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            onClick={() => step(1)}
            disabled={value >= max || saving}
            className="w-11 h-11 rounded-lg bg-white/[0.04] border border-white/[0.1] text-white/70 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 text-lg font-bold flex items-center justify-center transition-colors"
          >
            +
          </button>
        </div>
        <p className="text-[10.5px] text-white/30 font-mono mt-2 text-center">
          Range: {min} – {max}
        </p>
      </div>

      <ModalFooter
        saving={saving}
        error={error}
        canSave={true}
        onCancel={onClose}
        onSave={() => onSave(value)}
      />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// DATE INPUT
// ═══════════════════════════════════════════════════════════════════════════

function DateInput({
  meta, currentValue, saving, error, onError, onSave, onClose,
}: {
  meta: FieldMeta
  currentValue: any
  saving: boolean
  error: string | null
  onError: (e: string | null) => void
  onSave: (v: string | null) => void
  onClose: () => void
}) {
  const initial = currentValue
    ? (typeof currentValue === 'string' ? currentValue.slice(0, 10) : new Date(currentValue).toISOString().slice(0, 10))
    : ''
  const [value, setValue] = useState<string>(initial)

  const today = new Date().toISOString().slice(0, 10)

  return (
    <>
      <div className="p-5">
        <input
          autoFocus
          type="date"
          value={value}
          max={today}
          onChange={e => { setValue(e.target.value); onError(null) }}
          className="w-full h-11 bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 text-[14px] text-white outline-none focus:border-white/25 focus:bg-white/[0.06] transition-colors [color-scheme:dark]"
        />
        {value && (
          <button
            onClick={() => { setValue(''); onError(null) }}
            className="mt-2 text-[11.5px] font-semibold text-white/50 hover:text-white transition-colors"
          >
            Clear date
          </button>
        )}
      </div>

      <ModalFooter
        saving={saving}
        error={error}
        canSave={true}
        onCancel={onClose}
        onSave={() => onSave(value || null)}
      />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// INDUSTRY AUTOCOMPLETE
// ═══════════════════════════════════════════════════════════════════════════

function IndustryInput({
  meta, currentValue, saving, error, onError, onSave, onClose,
}: {
  meta: FieldMeta
  currentValue: any
  saving: boolean
  error: string | null
  onError: (e: string | null) => void
  onSave: (v: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string>(String(currentValue || ''))
  const [results, setResults] = useState<Array<{ id: string | number; name: string; popular?: boolean }>>([])
  const [loading, setLoading] = useState(false)

  // Debounced search
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/sectors/search?q=' + encodeURIComponent(query))
        const json = await res.json()
        setResults(json.sectors || [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  return (
    <>
      <div className="p-5">
        {selected && (
          <div className="mb-3 flex items-center gap-2 bg-white/[0.06] border border-white/[0.15] rounded-lg px-3 py-2">
            <Check size={12} weight="bold" className="text-emerald-400" />
            <span className="text-[13px] font-semibold text-white flex-1 truncate">{selected}</span>
            <button
              onClick={() => setSelected('')}
              className="text-white/40 hover:text-white transition-colors"
              aria-label="Clear"
            >
              <X size={13} />
            </button>
          </div>
        )}

        <div className="relative">
          <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          <input
            autoFocus
            value={query}
            onChange={e => { setQuery(e.target.value); onError(null) }}
            placeholder={meta.placeholder}
            className="w-full pl-9 h-10 bg-white/[0.04] border border-white/[0.1] rounded-lg text-[13.5px] text-white placeholder:text-white/30 outline-none focus:border-white/25 focus:bg-white/[0.06] transition-colors"
          />
        </div>

        <div className="mt-3 max-h-[280px] overflow-y-auto -mr-1 pr-1 space-y-0.5">
          {loading ? (
            <div className="py-6 flex items-center justify-center gap-2 text-[12px] text-white/40">
              <CircleNotch size={12} className="animate-spin" /> Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-white/35">
              {query ? 'No matches found' : 'Start typing to search'}
            </div>
          ) : (
            results.map(s => (
              <button
                key={s.id}
                onClick={() => setSelected(s.name)}
                className={
                  'w-full text-left px-3 py-2 rounded-md text-[13px] transition-colors flex items-center justify-between gap-2 ' +
                  (selected === s.name
                    ? 'bg-white/[0.08] text-white'
                    : 'text-white/70 hover:bg-white/[0.04] hover:text-white')
                }
              >
                <span className="truncate">{s.name}</span>
                {s.popular && (
                  <span className="text-[9px] font-mono uppercase tracking-wider text-white/40 shrink-0">
                    Popular
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <ModalFooter
        saving={saving}
        error={error}
        canSave={!!selected}
        onCancel={onClose}
        onSave={() => onSave(selected)}
      />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// LOCATION AUTOCOMPLETE
// ═══════════════════════════════════════════════════════════════════════════

function LocationInput({
  meta, currentValue, saving, error, onError, onSave, onClose,
}: {
  meta: FieldMeta
  currentValue: any
  saving: boolean
  error: string | null
  onError: (e: string | null) => void
  onSave: (v: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState<string>(String(currentValue || ''))
  const [suggestions, setSuggestions] = useState<Array<{ id: string | number; name: string }>>([])
  const [loading, setLoading] = useState(false)
  const [showSuggest, setShowSuggest] = useState(false)

  const PRESET = ['Remote', 'Hybrid']

  useEffect(() => {
    if (!value || value.length < 2 || PRESET.includes(value)) {
      setSuggestions([])
      return
    }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/locations/search?q=' + encodeURIComponent(value))
        const json = await res.json()
        setSuggestions(json.locations || [])
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [value])

  return (
    <>
      <div className="p-5">
        <div className="flex gap-1.5 mb-2">
          {PRESET.map(p => (
            <button
              key={p}
              onClick={() => { setValue(p); setShowSuggest(false) }}
              className={
                'px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ' +
                (value === p
                  ? 'bg-white/[0.08] border-white/[0.2] text-white'
                  : 'bg-white/[0.03] border-white/[0.08] text-white/60 hover:text-white')
              }
            >
              {p}
            </button>
          ))}
        </div>
        <input
          autoFocus
          value={value}
          onChange={e => { setValue(e.target.value); setShowSuggest(true); onError(null) }}
          onFocus={() => setShowSuggest(true)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !saving) { e.preventDefault(); onSave(value) }
          }}
          placeholder={meta.placeholder}
          maxLength={meta.maxLength}
          className="w-full h-11 bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-white/25 focus:bg-white/[0.06] transition-colors"
        />
        {showSuggest && suggestions.length > 0 && (
          <div className="mt-2 max-h-[200px] overflow-y-auto space-y-0.5 border border-white/[0.06] rounded-lg bg-black/40">
            {suggestions.map(s => (
              <button
                key={s.id}
                onClick={() => { setValue(s.name); setShowSuggest(false) }}
                className="w-full text-left px-3 py-2 text-[13px] text-white/80 hover:bg-white/[0.05] hover:text-white transition-colors"
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
        {loading && (
          <p className="text-[11px] text-white/40 mt-2 flex items-center gap-1.5">
            <CircleNotch size={10} className="animate-spin" /> Searching...
          </p>
        )}
      </div>

      <ModalFooter
        saving={saving}
        error={error}
        canSave={true}
        onCancel={onClose}
        onSave={() => onSave(value.trim())}
      />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// LICENSE PICKER (search + list)
// ═══════════════════════════════════════════════════════════════════════════

function LicenseInput({
  currentValue, saving, error, onError, onSave, onClose,
}: {
  currentValue: any
  saving: boolean
  error: string | null
  onError: (e: string | null) => void
  onSave: (v: string) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<string>(String(currentValue || 'None'))
  const [query, setQuery] = useState('')
  const [customValue, setCustomValue] = useState('')

  const filtered = COMMON_LICENSES.filter(l =>
    l.label.toLowerCase().includes(query.toLowerCase()) ||
    l.id.toLowerCase().includes(query.toLowerCase())
  )

  const isCustom = selected === 'Custom'

  return (
    <>
      <div className="p-5">
        <div className="relative mb-3">
          <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search licenses..."
            className="w-full pl-9 h-10 bg-white/[0.04] border border-white/[0.1] rounded-lg text-[13.5px] text-white placeholder:text-white/30 outline-none focus:border-white/25 focus:bg-white/[0.06] transition-colors"
          />
        </div>

        <div className="max-h-[280px] overflow-y-auto -mr-1 pr-1 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-white/35">No licenses match</div>
          ) : (
            filtered.map(l => {
              const isSelected = selected === l.id
              return (
                <button
                  key={l.id}
                  onClick={() => { setSelected(l.id); onError(null) }}
                  className={
                    'w-full text-left px-3 py-2 rounded-md transition-colors flex items-start gap-3 ' +
                    (isSelected
                      ? 'bg-white/[0.08]'
                      : 'hover:bg-white/[0.04]')
                  }
                >
                  <div className={
                    'w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ' +
                    (isSelected ? 'bg-white border-white' : 'border-white/25')
                  }>
                    {isSelected && <div className="w-1 h-1 rounded-full bg-black" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={'text-[13px] font-semibold ' + (isSelected ? 'text-white' : 'text-white/85')}>
                      {l.label}
                    </p>
                    {l.description && (
                      <p className="text-[11px] text-white/45 mt-0.5">{l.description}</p>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {isCustom && (
          <div className="mt-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg">
            <label className="text-[10.5px] font-mono uppercase tracking-wider text-white/40 block mb-1.5">
              Custom license name
            </label>
            <input
              value={customValue}
              onChange={e => setCustomValue(e.target.value.slice(0, 60))}
              placeholder="e.g. Business Source License 1.1"
              className="w-full h-9 bg-white/[0.04] border border-white/[0.1] rounded-md px-3 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/25 transition-colors"
            />
          </div>
        )}
      </div>

      <ModalFooter
        saving={saving}
        error={error}
        canSave={isCustom ? !!customValue.trim() : !!selected}
        onCancel={onClose}
        onSave={() => onSave(isCustom ? customValue.trim() : selected)}
      />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// VISIBILITY 3-WAY PICKER (+ show_in_explore sub-toggle)
// ═══════════════════════════════════════════════════════════════════════════

function VisibilityInput({
  currentValue, saving, error, onSave, onClose,
}: {
  currentValue: any
  saving: boolean
  error: string | null
  onSave: (v: { visibility: string; show_in_explore: boolean }) => void
  onClose: () => void
}) {
  const initial = ['public', 'unlisted', 'private'].includes(String(currentValue))
    ? String(currentValue)
    : 'private'
  const [visibility, setVisibility] = useState<string>(initial)
  const [showInExplore, setShowInExplore] = useState(true)

  const options = [
    {
      id: 'public',
      label: 'Public',
      description: 'Anyone on DSRT can discover and view.',
      icon: Compass,
    },
    {
      id: 'unlisted',
      label: 'Unlisted',
      description: 'Only people with the direct link can view.',
      icon: Eye,
    },
    {
      id: 'private',
      label: 'Private',
      description: 'Only you and invited team members can view.',
      icon: EyeSlash,
    },
  ]

  return (
    <>
      <div className="p-5 space-y-2">
        {options.map(opt => {
          const isSelected = visibility === opt.id
          const OptIcon = opt.icon
          return (
            <button
              key={opt.id}
              onClick={() => setVisibility(opt.id)}
              disabled={saving}
              className={
                'w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 disabled:cursor-wait ' +
                (isSelected
                  ? 'bg-white/[0.08] border-white/[0.2]'
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]')
              }
            >
              <div className="w-8 h-8 rounded-md bg-black/40 border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                <OptIcon size={14} className={isSelected ? 'text-white' : 'text-white/50'} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={'text-[13.5px] font-semibold leading-tight ' + (isSelected ? 'text-white' : 'text-white/85')}>
                    {opt.label}
                  </p>
                  {isSelected && (
                    <Check size={12} weight="bold" className="text-emerald-400" />
                  )}
                </div>
                <p className="text-[11.5px] text-white/45 mt-0.5 leading-snug">
                  {opt.description}
                </p>
              </div>
            </button>
          )
        })}

        {visibility === 'public' && (
          <label className="mt-3 flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.04] transition-colors">
            <input
              type="checkbox"
              checked={showInExplore}
              onChange={e => setShowInExplore(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-white cursor-pointer"
            />
            <div>
              <p className="text-[12.5px] font-semibold text-white">
                Show in Explore Projects
              </p>
              <p className="text-[11px] text-white/50 mt-0.5 leading-snug">
                Recommended to discoverable users based on interests, tech, and domain matches.
              </p>
            </div>
          </label>
        )}
      </div>

      <ModalFooter
        saving={saving}
        error={error}
        canSave={true}
        onCancel={onClose}
        onSave={() => onSave({ visibility, show_in_explore: showInExplore })}
      />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED FOOTER (Cancel + Save + Error)
// ═══════════════════════════════════════════════════════════════════════════

function ModalFooter({
  saving, error, canSave, onCancel, onSave,
}: {
  saving: boolean
  error: string | null
  canSave: boolean
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <div className="border-t border-white/[0.06] bg-[#0a0a0f] px-5 py-3.5 flex-shrink-0">
      {error && (
        <div className="mb-2.5 flex items-start gap-2 text-[12px] text-red-300 bg-red-500/8 border border-red-500/20 rounded-md px-2.5 py-1.5">
          <Warning size={12} weight="fill" className="text-red-400 mt-0.5 shrink-0" />
          <span className="leading-snug">{error}</span>
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 h-9 text-[13px] font-medium text-white/70 hover:text-white border border-white/[0.1] hover:bg-white/[0.04] rounded-md disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving || !canSave}
          className="px-5 h-9 text-[13px] font-semibold bg-white text-black hover:bg-white/90 rounded-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
        >
          {saving ? (
            <><CircleNotch size={12} className="animate-spin" /> Saving...</>
          ) : (
            <><Check size={13} weight="bold" /> Save</>
          )}
        </button>
      </div>
    </div>
  )
}